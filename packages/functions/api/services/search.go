package services

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	"alexandria.isnan.eu/functions/internal/domain"
	"alexandria.isnan.eu/functions/internal/searchindex"
	"github.com/blugelabs/bluge"
	"github.com/rs/zerolog/log"
)

func (s *services) SearchItems(ownerId string, terms []string) ([]*domain.LibraryItem, error) {
	// Get pre-built Bluge index from S3
	indexDir, cleanup, err := s.storage.GetBlugeIndex()
	if err != nil {
		return nil, err
	}
	if indexDir == "" {
		// No index exists yet
		return []*domain.LibraryItem{}, nil
	}
	defer cleanup()

	// Get shared libraries for access filtering
	sharedLibraries, err := s.storage.GetSharedLibraries()
	if err != nil {
		return nil, err
	}

	// Open Bluge reader
	cfg := bluge.DefaultConfig(indexDir)
	reader, err := bluge.OpenReader(cfg)
	if err != nil {
		msg := fmt.Sprintf("Failed to open index reader: %s", err.Error())
		log.Error().Msg(msg)
		return nil, errors.New(msg)
	}
	defer func() { _ = reader.Close() }()

	// The document layout and this query live together in internal/searchindex,
	// because they have to agree on the searchable fields and on the fold
	// applied to them. They previously did not.
	textQuery := searchindex.TextQuery(terms)

	// Build access filter: ownerId = currentUser OR (ownerId, libraryId) in sharedLibraries
	accessQuery := bluge.NewBooleanQuery()

	// User's own items
	accessQuery.AddShould(bluge.NewTermQuery(ownerId).SetField("ownerId"))

	// Libraries shared with user
	if entries, ok := sharedLibraries[ownerId]; ok {
		for _, entry := range entries {
			// Match both ownerId AND libraryId for shared library
			sharedQuery := bluge.NewBooleanQuery()
			sharedQuery.AddMust(bluge.NewTermQuery(entry.OwnerId).SetField("ownerId"))
			sharedQuery.AddMust(bluge.NewTermQuery(entry.LibraryId).SetField("libraryId"))
			accessQuery.AddShould(sharedQuery)
		}
	}

	// Combine: (text match) AND (access filter)
	finalQuery := bluge.NewBooleanQuery()
	finalQuery.AddMust(textQuery)
	finalQuery.AddMust(accessQuery)

	// Execute search
	req := bluge.NewAllMatches(finalQuery)
	dmi, err := reader.Search(context.TODO(), req)
	if err != nil {
		msg := fmt.Sprintf("Failed to execute search: %s", err.Error())
		log.Error().Msg(msg)
		return nil, errors.New(msg)
	}

	// Collect matched items with their relevance score. The score is the only
	// ordering this search has: the fetch that follows returns items in no
	// particular order, so dropping it here leaves results effectively
	// unranked.
	type scoredMatch struct {
		item  domain.IndexItem
		score float64
	}

	matches := []scoredMatch{}
	next, err := dmi.Next()
	for err == nil && next != nil {
		score := next.Score
		_ = next.VisitStoredFields(func(field string, value []byte) bool {
			if field == "_id" {
				// Document ID format: "PK|SK"
				parts := strings.Split(string(value), "|")
				if len(parts) == 2 {
					matches = append(matches, scoredMatch{
						item:  domain.IndexItem{PK: parts[0], SK: parts[1]},
						score: score,
					})
				}
			}
			return true
		})
		next, err = dmi.Next()
	}
	if err != nil {
		msg := fmt.Sprintf("Failed to read search results: %s", err.Error())
		log.Error().Msg(msg)
		return nil, errors.New(msg)
	}

	// Most relevant first. SortStable keeps equally scored matches in the
	// order the index yielded them, so the result set does not reshuffle
	// between two identical searches.
	sort.SliceStable(matches, func(i, j int) bool {
		return matches[i].score > matches[j].score
	})

	matchedItemsId := make([]domain.IndexItem, 0, len(matches))
	for _, m := range matches {
		matchedItemsId = append(matchedItemsId, m.item)
	}

	// Fetch full items from DynamoDB
	result, err := s.db.GetMatchedItems(matchedItemsId)
	if err != nil {
		return nil, err
	}

	// Pictures are now served via CloudFront URLs - no need to load bytes from S3

	return result, nil
}
