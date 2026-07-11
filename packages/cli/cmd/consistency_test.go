package cmd

import "testing"

func TestExtractOwnerIdFromPK(t *testing.T) {
	if got := extractOwnerIdFromPK("owner#ABC"); got != "ABC" {
		t.Fatalf("got %q", got)
	}
	if got := extractOwnerIdFromPK("nope"); got != "" {
		t.Fatalf("got %q", got)
	}
}

func TestExtractLibraryAndItemIdFromSK(t *testing.T) {
	lib, item := extractLibraryAndItemIdFromSK("library#L1#item#I1")
	if lib != "L1" || item != "I1" {
		t.Fatalf("got lib=%q item=%q", lib, item)
	}
}
