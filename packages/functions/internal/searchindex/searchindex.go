// Package searchindex owns the Bluge document layout and the text query that
// reads it. Both live here, together, because they have to agree on two things
// and previously did not: the set of searchable fields, and the fold applied to
// the text in them.
//
// The indexer once wrote no collection field while the search service queried
// one, so collection search matched nothing and reported no error. Keeping the
// two constructions in one package makes that divergence a compile-time
// concern rather than something a reader discovers by not finding their book.
package searchindex

import (
	"strings"

	"alexandria.isnan.eu/functions/internal/persistence"
	"github.com/blugelabs/bluge"
)

// The searchable fields. A field added here is indexed and queried in the same
// commit; ui-v3.md publishes this list to the reader at the zero-result state,
// so changing it changes what the app promises.
const (
	FieldTitle      = "title"
	FieldAuthors    = "authors"
	FieldDirectors  = "directors"
	FieldCast       = "cast"
	FieldCollection = "collection"
)

// searchableFields is the query side of the list above.
var searchableFields = []string{
	FieldTitle,
	FieldAuthors,
	FieldDirectors,
	FieldCast,
	FieldCollection,
}

// elisions is the pair of apostrophes French elision uses. The catalogue
// carries BOTH — the live index holds straight U+0027 and typographic U+2019
// in different titles — so anything keyed on one silently misses the other.
var elisions = strings.NewReplacer("'", " ", "\u2019", " ")

// Fold normalises text for indexing and for querying. Wildcard and fuzzy
// queries are term-level and bypass Bluge's analyzer, so the fold has to be
// applied explicitly on both sides.
//
// It splits elisions before folding, because Bluge's analyzer treats an
// apostrophe as a word character: `d'ambre` was one token, so a prefix query
// for `ambre` could not reach it, and the fuzzy clause answered with a
// DIFFERENT book one edit away. Splitting makes the elided head and the word
// itself separate tokens.
//
// The split lives HERE and deliberately not in persistence.NormalizeForMatching,
// which also builds DynamoDB sort keys: moving it down there would change the
// sort key of every item, reordering the browse stream and leaving every stored
// key stale until rewritten. Search and sort fold alike for accents; they are
// still different jobs.
func Fold(s string) string {
	return persistence.NormalizeForMatching(elisions.Replace(s))
}

// tokenize folds a term and splits what the fold produced. A reader's term
// arrives whole — the client splits input on whitespace only — so `l'etranger`
// is one term that folds into two tokens.
func tokenize(term string) []string {
	return strings.Fields(Fold(term))
}

// DocumentId is the Bluge document identifier for an item: its full DynamoDB
// primary key, which is what the search service reads back to fetch the item.
func DocumentId(item *persistence.LibraryItem) string {
	return item.PK + "|" + item.SK
}

// addFolded indexes a text field, folded, when it carries anything.
func addFolded(doc *bluge.Document, field string, value string) {
	if value == "" {
		return
	}
	doc.AddField(bluge.NewTextField(field, Fold(value)).StoreValue())
}

// NewDocument builds the indexed document for a book or a video. The summary
// and the ISBN are deliberately absent: ui-v3.md tells the reader, at the
// zero-result state, exactly which fields were searched, and those two are
// named as the ones that were not.
func NewDocument(item *persistence.LibraryItem) *bluge.Document {
	doc := bluge.NewDocument(DocumentId(item))

	addFolded(doc, FieldTitle, item.Title)
	addFolded(doc, FieldAuthors, strings.Join(item.Authors, " "))
	addFolded(doc, FieldDirectors, strings.Join(item.Directors, " "))
	addFolded(doc, FieldCast, strings.Join(item.Cast, " "))
	if item.CollectionName != nil {
		addFolded(doc, FieldCollection, *item.CollectionName)
	}

	// Keyword fields carry the access filter and are matched exactly, so they
	// are never folded.
	doc.AddField(bluge.NewKeywordField("ownerId", item.OwnerId).StoreValue())
	doc.AddField(bluge.NewKeywordField("libraryId", item.LibraryId).StoreValue())

	return doc
}

// TextQuery matches items whose searchable fields carry every term. Each term
// is tried as a prefix ("drag" reaching "dragons") and as a fuzzy match, which
// tolerates one edit for a typo.
func TextQuery(terms []string) bluge.Query {
	query := bluge.NewBooleanQuery()

	for _, term := range terms {
		// Every token the term folded into must match. Building one wildcard
		// from a folded term containing a space would match nothing at all.
		for _, token := range tokenize(term) {
			perToken := bluge.NewBooleanQuery()

			for _, field := range searchableFields {
				perToken.AddShould(bluge.NewWildcardQuery(token + "*").SetField(field))
				perToken.AddShould(bluge.NewFuzzyQuery(token).SetField(field))
			}

			query.AddMust(perToken)
		}
	}

	return query
}
