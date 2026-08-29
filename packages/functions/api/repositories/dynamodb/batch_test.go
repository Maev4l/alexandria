package dynamodb

import (
	"errors"
	"fmt"
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

// key builds a primary key map the way GetMatchedItems does, so the batching
// tests operate on the same shape the repository passes to DynamoDB.
func key(sk string) map[string]types.AttributeValue {
	return map[string]types.AttributeValue{
		"PK": &types.AttributeValueMemberS{Value: "owner#O1"},
		"SK": &types.AttributeValueMemberS{Value: sk},
	}
}

func keys(n int) []map[string]types.AttributeValue {
	out := make([]map[string]types.AttributeValue, 0, n)
	for i := 0; i < n; i++ {
		out = append(out, key(fmt.Sprintf("item#%03d", i)))
	}
	return out
}

// echoFetcher returns every requested key as a record, leaving nothing unprocessed.
func echoFetcher(sizes *[]int) batchKeyFetcher {
	return func(batch []map[string]types.AttributeValue) ([]map[string]types.AttributeValue, []map[string]types.AttributeValue, error) {
		*sizes = append(*sizes, len(batch))
		return batch, nil, nil
	}
}

// DynamoDB rejects a BatchGetItem carrying more than 100 keys with a
// ValidationException, so a search matching more items than that must be split.
func TestFetchKeysInBatches_SplitsRequestsAtHundredKeys(t *testing.T) {
	var sizes []int

	records, err := fetchKeysInBatches(keys(101), echoFetcher(&sizes))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(sizes) != 2 {
		t.Fatalf("expected 2 batches for 101 keys, got %d batches: %v", len(sizes), sizes)
	}
	if sizes[0] != 100 || sizes[1] != 1 {
		t.Errorf("expected batch sizes [100 1], got %v", sizes)
	}
	if len(records) != 101 {
		t.Errorf("expected 101 records returned, got %d", len(records))
	}
}

func TestFetchKeysInBatches_SendsExactlyOneRequestForHundredKeys(t *testing.T) {
	var sizes []int

	if _, err := fetchKeysInBatches(keys(100), echoFetcher(&sizes)); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(sizes) != 1 || sizes[0] != 100 {
		t.Errorf("expected a single batch of 100, got %v", sizes)
	}
}

func TestFetchKeysInBatches_SendsNoRequestForNoKeys(t *testing.T) {
	var sizes []int

	records, err := fetchKeysInBatches(nil, echoFetcher(&sizes))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(sizes) != 0 {
		t.Errorf("expected no requests, got %v", sizes)
	}
	if len(records) != 0 {
		t.Errorf("expected no records, got %d", len(records))
	}
}

// A partial response reports the keys it could not read in UnprocessedKeys.
// Dropping them silently loses search results with no reported failure.
func TestFetchKeysInBatches_RetriesUnprocessedKeys(t *testing.T) {
	calls := 0
	fetch := func(batch []map[string]types.AttributeValue) ([]map[string]types.AttributeValue, []map[string]types.AttributeValue, error) {
		calls++
		if calls == 1 {
			// Serve the first two, report the third as unprocessed.
			return batch[:2], batch[2:], nil
		}
		return batch, nil, nil
	}

	records, err := fetchKeysInBatches(keys(3), fetch)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if calls != 2 {
		t.Errorf("expected the unprocessed key to be retried, got %d calls", calls)
	}
	if len(records) != 3 {
		t.Errorf("expected all 3 records after retry, got %d", len(records))
	}
}

// Returning short results silently would leave the reader believing they do not
// own something they do. The failure has to reach the caller.
func TestFetchKeysInBatches_FailsWhenKeysStayUnprocessed(t *testing.T) {
	calls := 0
	fetch := func(batch []map[string]types.AttributeValue) ([]map[string]types.AttributeValue, []map[string]types.AttributeValue, error) {
		calls++
		return nil, batch, nil
	}

	_, err := fetchKeysInBatches(keys(1), fetch)
	if err == nil {
		t.Fatal("expected an error when keys stay unprocessed, got nil")
	}
	if calls < 2 {
		t.Errorf("expected retries before giving up, got %d calls", calls)
	}
}

func TestFetchKeysInBatches_PropagatesFetchError(t *testing.T) {
	boom := errors.New("boom")
	fetch := func(batch []map[string]types.AttributeValue) ([]map[string]types.AttributeValue, []map[string]types.AttributeValue, error) {
		return nil, nil, boom
	}

	_, err := fetchKeysInBatches(keys(1), fetch)
	if !errors.Is(err, boom) {
		t.Errorf("expected the fetch error to be propagated, got %v", err)
	}
}

// BatchGetItem responses are unordered, and the search ranks its results by
// relevance before fetching them, so the fetched records have to be put back
// into the order the caller asked for.
func TestOrderRecordsByKeys_RestoresRequestedOrder(t *testing.T) {
	requested := []map[string]types.AttributeValue{key("item#a"), key("item#b"), key("item#c")}
	// As DynamoDB might return them: no relation to the requested order.
	returned := []map[string]types.AttributeValue{key("item#c"), key("item#a"), key("item#b")}

	ordered := orderRecordsByKeys(returned, requested)

	got := make([]string, 0, len(ordered))
	for _, r := range ordered {
		got = append(got, r["SK"].(*types.AttributeValueMemberS).Value)
	}

	want := []string{"item#a", "item#b", "item#c"}
	for i := range want {
		if i >= len(got) || got[i] != want[i] {
			t.Fatalf("expected order %v, got %v", want, got)
		}
	}
}

// An item deleted between indexing and reading comes back with no record. It
// must drop out rather than leave a hole or shift everything after it.
func TestOrderRecordsByKeys_SkipsKeysWithNoRecord(t *testing.T) {
	requested := []map[string]types.AttributeValue{key("item#a"), key("item#gone"), key("item#c")}
	returned := []map[string]types.AttributeValue{key("item#c"), key("item#a")}

	ordered := orderRecordsByKeys(returned, requested)

	if len(ordered) != 2 {
		t.Fatalf("expected 2 records, got %d", len(ordered))
	}
	if ordered[0]["SK"].(*types.AttributeValueMemberS).Value != "item#a" {
		t.Errorf("expected item#a first, got %v", ordered[0]["SK"])
	}
	if ordered[1]["SK"].(*types.AttributeValueMemberS).Value != "item#c" {
		t.Errorf("expected item#c second, got %v", ordered[1]["SK"])
	}
}

// Two libraries can hold items whose ids collide only if the whole key is
// ignored, so ordering must key on the pair and not on the sort key alone.
func TestOrderRecordsByKeys_DistinguishesRecordsBySamePartitionAndSortKeyPair(t *testing.T) {
	other := map[string]types.AttributeValue{
		"PK": &types.AttributeValueMemberS{Value: "owner#O2"},
		"SK": &types.AttributeValueMemberS{Value: "item#a"},
	}
	requested := []map[string]types.AttributeValue{other, key("item#a")}
	returned := []map[string]types.AttributeValue{key("item#a"), other}

	ordered := orderRecordsByKeys(returned, requested)

	if len(ordered) != 2 {
		t.Fatalf("expected 2 records, got %d", len(ordered))
	}
	if ordered[0]["PK"].(*types.AttributeValueMemberS).Value != "owner#O2" {
		t.Errorf("expected owner#O2 first, got %v", ordered[0]["PK"])
	}
}
