package cmd

import (
	"testing"

	"alexandria.isnan.eu/cli/internal/dynamodb"
)

func TestFormatUserName(t *testing.T) {
	cases := []struct {
		name, email, want string
	}{
		{"John", "john@x.com", "John (john@x.com)"},
		{"john@x.com", "john@x.com", "john@x.com"}, // no "(email)" when identical
		{"Marie", "", "Marie"},
	}
	for _, tc := range cases {
		if got := formatUserName(tc.name, tc.email); got != tc.want {
			t.Errorf("formatUserName(%q,%q)=%q want %q", tc.name, tc.email, got, tc.want)
		}
	}
}

func TestCountByEntityType(t *testing.T) {
	items := []dynamodb.Item{
		{EntityType: "LIBRARY"},
		{EntityType: "BOOK"},
		{EntityType: "BOOK"},
		{EntityType: ""}, // counted as UNKNOWN
	}
	got := countByEntityType(items)
	if got["LIBRARY"] != 1 || got["BOOK"] != 2 || got["UNKNOWN"] != 1 {
		t.Fatalf("unexpected counts: %+v", got)
	}
}
