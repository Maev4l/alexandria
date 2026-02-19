package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"alexandria.isnan.eu/functions/internal/domain"
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

	// Build text query with prefix matching (wildcard) and fuzzy fallback
	textQuery := bluge.NewBooleanQuery()
	for _, term := range terms {
		termLower := strings.ToLower(term)
		termQuery := bluge.NewBooleanQuery()

		// Prefix matching (e.g., "drag" matches "dragons")
		termQuery.AddShould(bluge.NewWildcardQuery(termLower + "*").SetField("title"))
		termQuery.AddShould(bluge.NewWildcardQuery(termLower + "*").SetField("authors"))
		termQuery.AddShould(bluge.NewWildcardQuery(termLower + "*").SetField("collection"))

		// Fuzzy matching for typos (e.g., "dragns" matches "dragons")
		termQuery.AddShould(bluge.NewFuzzyQuery(termLower).SetField("title"))
		termQuery.AddShould(bluge.NewFuzzyQuery(termLower).SetField("authors"))
		termQuery.AddShould(bluge.NewFuzzyQuery(termLower).SetField("collection"))

		textQuery.AddMust(termQuery)
	}

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

	// Collect matched items
	matchedItemsId := []domain.IndexItem{}
	next, err := dmi.Next()
	for err == nil && next != nil {
		_ = next.VisitStoredFields(func(field string, value []byte) bool {
			if field == "_id" {
				// Document ID format: "PK|SK"
				parts := strings.Split(string(value), "|")
				if len(parts) == 2 {
					matchedItemsId = append(matchedItemsId, domain.IndexItem{
						PK: parts[0],
						SK: parts[1],
					})
				}
			}
			return true
		})
		next, err = dmi.Next()
	}

	// Fetch full items from DynamoDB
	result, err := s.db.GetMatchedItems(matchedItemsId)
	if err != nil {
		return nil, err
	}

	// Load pictures
	for _, i := range result {
		if i.PictureUrl != nil && *i.PictureUrl != "" {
			pic, err := s.storage.GetPicture(i.OwnerId, i.LibraryId, i.Id)
			if err != nil {
				return nil, err
			}
			i.Picture = pic
		}
	}

	return result, nil
}
