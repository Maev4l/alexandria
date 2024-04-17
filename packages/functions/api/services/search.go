package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"alexandria.isnan.eu/functions/internal/domain"
	"github.com/blugelabs/bluge"
	"github.com/rs/zerolog/log"
)

func (s *services) SearchItems(ownerId string, terms []string) ([]*domain.LibraryItem, error) {

	buf, err := s.storage.GetIndexes()
	if err != nil {
		return nil, err
	}

	var db domain.IndexDatabase
	err = json.Unmarshal(buf, &db)
	if err != nil {
		log.Error().Msgf("Failed to load index database: %s", err.Error())
		return nil, err
	}

	result := []*domain.LibraryItem{}

	// collect all items belonging to the owned libraries
	ownedLibraries, ok := db.Libraries[ownerId]
	if !ok {
		// User has no indexed libraries
		return result, nil
	}

	// Create indexer instance
	config := bluge.InMemoryOnlyConfig()
	writer, err := bluge.OpenWriter(config)
	if err != nil {
		msg := fmt.Sprintf("Failed to create index writer: %s", err.Error())
		log.Error().Msg(msg)
		return nil, errors.New(msg)
	}
	defer writer.Close()

	batch := bluge.NewBatch()

	// Collect all owned indexed items
	for _, il := range ownedLibraries {
		for _, ii := range il.Items {
			docId := fmt.Sprintf("owner#%s|library#%s#item#%s", ownerId, ii.LibraryId, ii.Id)
			doc := bluge.NewDocument(docId).AddField(bluge.NewTextField("keywords", strings.Join(append(ii.Authors, ii.Title), " ")))
			/* AddField(bluge.NewTextField("title", ii.Title)).
			AddField(bluge.NewTextField("authors", strings.Join(ii.Authors, " "))) */
			batch.Insert(doc)
		}
	}
	writer.Batch(batch)
	batch.Reset()

	// check if there are some shared libraries with the current users
	sls, ok := db.UsersToSharedLibraries[ownerId]
	// If there are some shared libraries collect shared indexed items
	if ok {
		// Iterate through all shared libraries
		for _, sl := range sls {
			// Go to pick the shared libray content
			o, ok := db.Libraries[sl.OwnerId]
			if ok {
				l, ok := o[sl.LibraryId]
				if ok {
					for _, ii := range l.Items {
						docId := fmt.Sprintf("owner#%s|library#%s#item#%s", ownerId, ii.LibraryId, ii.Id)
						doc := bluge.NewDocument(docId).AddField(bluge.NewTextField("keywords", strings.Join(append(ii.Authors, ii.Title), " ")))
						/*AddField(bluge.NewTextField("title", ii.Title)).
						AddField(bluge.NewTextField("authors", strings.Join(ii.Authors, " ")))*/
						batch.Insert(doc)
					}
					writer.Batch(batch)
					batch.Reset()
				}
			}
		}
	}

	reader, err := writer.Reader()
	if err != nil {
		msg := fmt.Sprintf("Failed to create index reader: %s", err.Error())
		log.Error().Msg(msg)
		return nil, errors.New(msg)
	}

	defer reader.Close()

	q := bluge.NewFuzzyQuery(terms[0]).SetField("keywords")
	req := bluge.NewTopNSearch(10, q)
	// Sort by score and title
	req.SortBy([]string{"-_score"})
	dmi, err := reader.Search(context.TODO(), req)
	if err != nil {
		msg := fmt.Sprintf("Failed to execute search: %s", err.Error())
		log.Error().Msg(msg)
		return nil, errors.New(msg)
	}

	matchedItemsId := []domain.IndexItem{}
	next, err := dmi.Next()
	for err == nil && next != nil {
		_ = next.VisitStoredFields(func(field string, value []byte) bool {
			if field == "_id" {
				// log.Info().Msgf("Matched document id: %s - score: %f", string(value), next.Score)
				i := strings.Split(string(value), "|")
				pk := i[0]
				sk := i[1]
				matchedItemsId = append(matchedItemsId, domain.IndexItem{
					PK: pk,
					SK: sk,
				})
			}
			return true
		})
		next, err = dmi.Next()
	}

	result, err = s.db.GetMatchedItems(matchedItemsId)

	for _, i := range result {
		if i.PictureUrl != nil && *i.PictureUrl != "" {
			pic, err := s.storage.GetPicture(i.OwnerId, i.LibraryId, i.Id)
			if err != nil {
				return nil, err
			}

			i.Picture = pic
		}
	}

	return result, err
}
