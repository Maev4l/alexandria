package dynamodb

import (
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

const (
	// DynamoDB rejects a BatchGetItem carrying more than 100 keys with a
	// ValidationException, so any larger key set has to be split.
	maxBatchGetKeys = 100

	// A partial response reports what it could not read in UnprocessedKeys,
	// which is DynamoDB asking to be called again rather than an error.
	maxBatchGetAttempts = 4
	batchGetBackoffBase = 50 * time.Millisecond
)

// batchKeyFetcher reads one batch of primary keys, returning the records it
// retrieved and the keys DynamoDB declined to process.
type batchKeyFetcher func(keys []map[string]types.AttributeValue) (records []map[string]types.AttributeValue, unprocessed []map[string]types.AttributeValue, err error)

// fetchKeysInBatches reads every key, splitting the set across as many requests
// as DynamoDB's per-call limit requires and retrying whatever comes back
// unprocessed. Keys that stay unprocessed are reported as an error rather than
// dropped: a search that silently returns fewer rows than it matched tells the
// reader they do not own something they do, and nothing surfaces the loss.
func fetchKeysInBatches(keys []map[string]types.AttributeValue, fetch batchKeyFetcher) ([]map[string]types.AttributeValue, error) {
	records := make([]map[string]types.AttributeValue, 0, len(keys))

	for start := 0; start < len(keys); start += maxBatchGetKeys {
		end := start + maxBatchGetKeys
		if end > len(keys) {
			end = len(keys)
		}

		pending := keys[start:end]
		for attempt := 0; len(pending) > 0; attempt++ {
			if attempt == maxBatchGetAttempts {
				return nil, fmt.Errorf("batch read gave up with %d key(s) still unprocessed after %d attempts", len(pending), maxBatchGetAttempts)
			}
			if attempt > 0 {
				// Exponential backoff: retrying a throttled batch immediately
				// tends to be throttled again.
				time.Sleep(batchGetBackoffBase << (attempt - 1))
			}

			got, unprocessed, err := fetch(pending)
			if err != nil {
				return nil, err
			}

			records = append(records, got...)
			pending = unprocessed
		}
	}

	return records, nil
}

// compositeKey identifies a record by its full primary key. The sort key alone
// is not unique across partitions.
func compositeKey(record map[string]types.AttributeValue) string {
	pk, _ := record["PK"].(*types.AttributeValueMemberS)
	sk, _ := record["SK"].(*types.AttributeValueMemberS)
	if pk == nil || sk == nil {
		return ""
	}
	return pk.Value + "|" + sk.Value
}

// orderRecordsByKeys puts fetched records back into the order their keys were
// requested in. BatchGetItem responses carry no ordering, and search hands its
// keys over ranked by relevance, so without this the ranking is discarded.
// A key with no record — an item deleted between indexing and reading — drops
// out rather than leaving a hole.
func orderRecordsByKeys(records []map[string]types.AttributeValue, keys []map[string]types.AttributeValue) []map[string]types.AttributeValue {
	byKey := make(map[string]map[string]types.AttributeValue, len(records))
	for _, record := range records {
		byKey[compositeKey(record)] = record
	}

	ordered := make([]map[string]types.AttributeValue, 0, len(records))
	for _, k := range keys {
		if record, ok := byKey[compositeKey(k)]; ok {
			ordered = append(ordered, record)
		}
	}

	return ordered
}
