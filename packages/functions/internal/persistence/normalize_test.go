package persistence

import "testing"

func TestNormalizeForMatching_StripsDiacriticsAndLowercases(t *testing.T) {
	cases := map[string]string{
		"Éléphants":  "elephants",
		"L'Étranger": "l'etranger",
		"ÎLE":        "ile",
		"Meaulnes":   "meaulnes",
	}

	for in, want := range cases {
		if got := NormalizeForMatching(in); got != want {
			t.Errorf("NormalizeForMatching(%q) = %q, want %q", in, got, want)
		}
	}
}

// THIS FUNCTION BUILDS DYNAMODB SORT KEYS. The search index folds elisions —
// `d'ambre` has to become two tokens or a prefix query cannot reach the word
// after the apostrophe — and the obvious place to put that split is here,
// where search and sort already share a fold.
//
// It must not go here. Sort keys are persisted: changing this reorders the
// browse stream and leaves every stored GSI1SK/GSI2SK stale until each item is
// rewritten, which is a data migration rather than a search-index resync. The
// split lives in internal/searchindex instead, above this function.
func TestNormalizeForMatching_KeepsApostrophes_BecauseSortKeysArePersisted(t *testing.T) {
	if got := NormalizeForMatching("L'Étranger"); got != "l'etranger" {
		t.Errorf("NormalizeForMatching must not split elisions, got %q", got)
	}
	if got := NormalizeForMatching("Dragons d’automne"); got != "dragons d’automne" {
		t.Errorf("NormalizeForMatching must not split typographic elisions, got %q", got)
	}
}

// The sort keys these produce are stored on every item, so their exact shape is
// a persisted contract and not an implementation detail. Hand-derived rather
// than read off the code they check.
func TestSortKeys_AreStableForAnElidedTitle(t *testing.T) {
	if got := MakeLibraryItemGSI2SK("L'Étranger"); got != "item#l'etranger" {
		t.Errorf("MakeLibraryItemGSI2SK changed shape: %q", got)
	}

	order := 3
	collection := "Le Cycle d'Ambre"
	got := MakeLibraryItemGSI1SK("Les Neuf Princes", &collection, &order)
	if want := "item#le cycle d'ambre#00003#les neuf princes"; got != want {
		t.Errorf("MakeLibraryItemGSI1SK = %q, want %q", got, want)
	}
}
