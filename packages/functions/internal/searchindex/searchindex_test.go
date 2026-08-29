package searchindex

import (
	"context"
	"sort"
	"strings"
	"testing"

	"alexandria.isnan.eu/functions/internal/persistence"
	"github.com/blugelabs/bluge"
)

// buildIndex indexes the given items into a real in-memory Bluge index, so the
// tests exercise the indexing and querying sides against each other rather than
// against a mock. The two sides disagreeing is the defect class this package
// exists to close.
func buildIndex(t *testing.T, items ...*persistence.LibraryItem) *bluge.Reader {
	t.Helper()

	cfg := bluge.InMemoryOnlyConfig()
	writer, err := bluge.OpenWriter(cfg)
	if err != nil {
		t.Fatalf("failed to open writer: %v", err)
	}

	batch := bluge.NewBatch()
	for _, item := range items {
		batch.Insert(NewDocument(item))
	}
	if err := writer.Batch(batch); err != nil {
		t.Fatalf("failed to write batch: %v", err)
	}

	reader, err := writer.Reader()
	if err != nil {
		t.Fatalf("failed to open reader: %v", err)
	}
	t.Cleanup(func() { _ = reader.Close(); _ = writer.Close() })

	return reader
}

// search runs the shared text query and returns the matched document ids.
func search(t *testing.T, reader *bluge.Reader, terms ...string) []string {
	t.Helper()

	dmi, err := reader.Search(context.Background(), bluge.NewAllMatches(TextQuery(terms)))
	if err != nil {
		t.Fatalf("search failed: %v", err)
	}

	ids := []string{}
	next, err := dmi.Next()
	for err == nil && next != nil {
		_ = next.VisitStoredFields(func(field string, value []byte) bool {
			if field == "_id" {
				ids = append(ids, string(value))
			}
			return true
		})
		next, err = dmi.Next()
	}
	if err != nil {
		t.Fatalf("iterating matches failed: %v", err)
	}

	sort.Strings(ids)
	return ids
}

func item(id, title string) *persistence.LibraryItem {
	return &persistence.LibraryItem{
		PK:        "owner#O1",
		SK:        "library#L1#item#" + id,
		Id:        id,
		Title:     title,
		OwnerId:   "O1",
		LibraryId: "L1",
	}
}

func contains(ids []string, id string) bool {
	for _, got := range ids {
		if strings.HasSuffix(got, "item#"+id) {
			return true
		}
	}
	return false
}

// The catalogue is deliberately half French. Two missing accents put a query
// two edits from its target, past the default fuzziness of 1, so folding at
// both index and query time is what makes the term reachable at all.
func TestTextQuery_FindsAnAccentedTitleFromAnUnaccentedTerm(t *testing.T) {
	reader := buildIndex(t, item("i1", "Les éléphants de mer"))

	ids := search(t, reader, "elephants")

	if !contains(ids, "i1") {
		t.Errorf("expected 'elephants' to match 'Les éléphants de mer', got %v", ids)
	}
}

// The fold has to run on the query side too, or an accented query stops
// matching the folded text that was indexed.
func TestTextQuery_FindsAnAccentedTitleFromAnAccentedTerm(t *testing.T) {
	reader := buildIndex(t, item("i1", "Les éléphants de mer"))

	ids := search(t, reader, "éléphants")

	if !contains(ids, "i1") {
		t.Errorf("expected 'éléphants' to match its own title, got %v", ids)
	}
}

// The search service has always queried a collection field that the indexer
// never wrote, so collection search matched nothing.
func TestTextQuery_MatchesOnCollectionName(t *testing.T) {
	collection := "Blake et Mortimer"
	book := item("i1", "Le Secret de l'Espadon")
	book.CollectionName = &collection

	ids := search(t, buildIndex(t, book), "mortimer")

	if !contains(ids, "i1") {
		t.Errorf("expected a collection name to be searchable, got %v", ids)
	}
}

func TestTextQuery_MatchesOnAuthors(t *testing.T) {
	book := item("i1", "L'Étranger")
	book.Authors = []string{"Albert Camus"}

	ids := search(t, buildIndex(t, book), "camus")

	if !contains(ids, "i1") {
		t.Errorf("expected an author to be searchable, got %v", ids)
	}
}

func TestTextQuery_MatchesOnDirectorsAndCast(t *testing.T) {
	film := item("i1", "Le Samouraï")
	film.Directors = []string{"Jean-Pierre Melville"}
	film.Cast = []string{"Alain Delon"}

	if ids := search(t, buildIndex(t, film), "melville"); !contains(ids, "i1") {
		t.Errorf("expected a director to be searchable, got %v", ids)
	}
	if ids := search(t, buildIndex(t, film), "delon"); !contains(ids, "i1") {
		t.Errorf("expected cast to be searchable, got %v", ids)
	}
}

func TestTextQuery_MatchesOnAPrefix(t *testing.T) {
	reader := buildIndex(t, item("i1", "Le Grand Meaulnes"))

	if ids := search(t, reader, "meaul"); !contains(ids, "i1") {
		t.Errorf("expected a prefix to match, got %v", ids)
	}
}

// Every term has to match, or a two-word query returns everything matching
// either word.
func TestTextQuery_RequiresEveryTermToMatch(t *testing.T) {
	reader := buildIndex(t,
		item("i1", "Le Grand Meaulnes"),
		item("i2", "Le Petit Prince"),
	)

	ids := search(t, reader, "grand", "meaulnes")

	if contains(ids, "i2") {
		t.Errorf("expected 'Le Petit Prince' not to match both terms, got %v", ids)
	}
	if !contains(ids, "i1") {
		t.Errorf("expected 'Le Grand Meaulnes' to match both terms, got %v", ids)
	}
}

// The summary is deliberately not indexed; ui-v3.md tells the reader so at the
// zero-result state.
func TestTextQuery_DoesNotMatchOnSummary(t *testing.T) {
	book := item("i1", "L'Étranger")
	book.Summary = "Un homme assiste aux funérailles de sa mère"

	if ids := search(t, buildIndex(t, book), "funerailles"); contains(ids, "i1") {
		t.Errorf("expected the summary not to be searchable, got %v", ids)
	}
}

func TestFold_StripsDiacriticsAndLowercases(t *testing.T) {
	cases := map[string]string{
		"Éléphants":  "elephants",
		"L'Étranger": "l etranger",
		"Meaulnes":   "meaulnes",
		"ÎLE":        "ile",
	}

	for in, want := range cases {
		if got := Fold(in); got != want {
			t.Errorf("Fold(%q) = %q, want %q", in, got, want)
		}
	}
}

// French elision keeps `d'ambre` as a single token in Bluge's analyzer, so a
// prefix query for the word AFTER the apostrophe matched nothing. Worse than
// nothing, in fact: `ambre` returned `en pleine ombre` on a one-edit fuzzy
// match while the book actually named Ambre stayed hidden, so the reader is
// handed a different book and concludes they do not own theirs.
func TestTextQuery_FindsAWordAfterAStraightApostrophe(t *testing.T) {
	reader := buildIndex(t, item("i1", "Les 9 princes d'Ambre"))

	if ids := search(t, reader, "ambre"); !contains(ids, "i1") {
		t.Errorf("expected 'ambre' to match \"Les 9 princes d'Ambre\", got %v", ids)
	}
}

// The catalogue carries BOTH apostrophe forms — the live index has straight
// U+0027 and typographic U+2019 in different titles — so a fix keyed on one
// would silently miss the other, which is exactly how the accent defect worked.
func TestTextQuery_FindsAWordAfterATypographicApostrophe(t *testing.T) {
	reader := buildIndex(t, item("i1", "Dragons d’un crépuscule d’automne"))

	if ids := search(t, reader, "automne"); !contains(ids, "i1") {
		t.Errorf("expected 'automne' to match a title using U+2019, got %v", ids)
	}
}

// The client splits the reader's input on whitespace only, so an elided word
// arrives as ONE term. Folding it yields two tokens, and both have to be
// required — a wildcard built from a term containing a space matches nothing.
func TestTextQuery_MatchesATermTheReaderTypedWithAnApostrophe(t *testing.T) {
	reader := buildIndex(t, item("i1", "L'Étranger"))

	for _, term := range []string{"l'etranger", "l’étranger", "etranger"} {
		if ids := search(t, reader, term); !contains(ids, "i1") {
			t.Errorf("expected %q to match \"L'Étranger\", got %v", term, ids)
		}
	}
}

// Splitting must not turn every term into a match-anything query: a term whose
// elided head is a single letter still has to require the rest.
func TestTextQuery_StillRequiresTheWordAfterAnElision(t *testing.T) {
	reader := buildIndex(t,
		item("i1", "L'Étranger"),
		item("i2", "Le Grand Meaulnes"),
	)

	if ids := search(t, reader, "l'etranger"); contains(ids, "i2") {
		t.Errorf("expected \"Le Grand Meaulnes\" not to match 'l'etranger', got %v", ids)
	}
}

func TestFold_SplitsBothApostropheForms(t *testing.T) {
	cases := map[string]string{
		"L'Étranger":            "l etranger",
		"L’Étranger":            "l etranger",
		"Les 9 princes d'Ambre": "les 9 princes d ambre",
	}

	for in, want := range cases {
		if got := Fold(in); got != want {
			t.Errorf("Fold(%q) = %q, want %q", in, got, want)
		}
	}
}
