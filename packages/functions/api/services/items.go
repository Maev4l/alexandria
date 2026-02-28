package services

import (
	"errors"
	"fmt"
	"time"

	"alexandria.isnan.eu/functions/internal/domain"
	"alexandria.isnan.eu/functions/internal/identifier"
	"github.com/rs/zerolog/log"
)

func (s *services) DeleteLibraryItemHistory(ownerId string, libraryId string, itemId string) error {
	item, err := s.db.GetLibraryItem(ownerId, libraryId, itemId)
	if err != nil {
		return err
	}

	if item.LentTo != nil && len(*item.LentTo) != 0 {
		msg := "item already lent"
		log.Error().Str("id", item.Id).Msg(msg)
		return errors.New(msg)
	}

	err = s.db.DeleteItemEvents(item)
	if err != nil {
		return err
	}

	return nil
}

func (s *services) GetLibraryItemHistory(ownerId string, libraryId string, itemId string, continuationToken string, pageSize int) (*domain.ItemHistory, error) {
	item, err := s.db.GetLibraryItem(ownerId, libraryId, itemId)
	if err != nil {
		return nil, err
	}

	history, err := s.db.QueryItemEvents(item, continuationToken, pageSize)
	if err != nil {
		return nil, err
	}

	return history, nil
}

func (s *services) LendItem(ownerId string, libraryId string, itemId string, lendTo string) error {

	item, err := s.db.GetLibraryItem(ownerId, libraryId, itemId)
	if err != nil {
		return err
	}

	if item.LentTo != nil {
		msg := "item already lent"
		log.Error().Str("id", itemId).Msg(msg)
		return errors.New(msg)
	}

	now := time.Now().UTC()

	err = s.db.PutItemEvent(item, domain.Lent, lendTo, &now)
	if err != nil {
		return err
	}

	return nil
}

func (s *services) ReturnItem(ownerId string, libraryId string, itemId string, from string) error {
	item, err := s.db.GetLibraryItem(ownerId, libraryId, itemId)
	if err != nil {
		return err
	}

	if item.LentTo == nil {
		msg := "item not lent"
		log.Error().Str("id", itemId).Msg(msg)
		return errors.New(msg)
	}

	now := time.Now().UTC()

	err = s.db.PutItemEvent(item, domain.Returned, from, &now)
	if err != nil {
		return err
	}

	return nil
}

func (s *services) DeleteItem(i *domain.LibraryItem) error {
	// Get current item to check if it's in a collection
	current, err := s.db.GetLibraryItem(i.OwnerId, i.LibraryId, i.Id)
	if err != nil {
		return err
	}

	err = s.db.DeleteLibraryItem(i)
	if err != nil {
		return err
	}

	// Decrement collection item count if item was in a collection
	if current.CollectionId != nil && *current.CollectionId != "" {
		err = s.db.IncrementCollectionItemCount(i.OwnerId, i.LibraryId, *current.CollectionId, -1)
		if err != nil {
			// Log but don't fail - eventual consistency via stream will fix this
			log.Warn().Str("collectionId", *current.CollectionId).Msgf("Failed to decrement collection item count: %s", err.Error())
		}
	}

	err = s.storage.DeletePicture(i.OwnerId, i.LibraryId, i.Id)
	if err != nil {
		return err
	}
	return nil
}

func (s *services) UpdateItem(i *domain.LibraryItem, fetchPic bool) error {
	library, err := s.db.GetLibrary(i.OwnerId, i.LibraryId)
	if err != nil {
		return err
	}

	if library.OwnerId != i.OwnerId {
		msg := fmt.Sprintf("Library %s does not belong to user", i.LibraryId)
		log.Error().Msg(msg)
		return errors.New(msg)
	}

	// Get current item to track collection changes
	currentItem, err := s.db.GetLibraryItem(i.OwnerId, i.LibraryId, i.Id)
	if err != nil {
		return err
	}

	if fetchPic && i.PictureUrl != nil && *i.PictureUrl != "" {
		data, err := fetchPicture(*i.PictureUrl)
		if err != nil {
			return err
		}

		// save picture into S3
		err = s.storage.PutPicture(i.OwnerId, i.LibraryId, i.Id, data)
		if err != nil {
			return err
		}
	}

	i.LibraryName = library.Name

	// If collectionId is provided, look up the collection to get the name
	if i.CollectionId != nil && *i.CollectionId != "" {
		collection, err := s.db.GetCollection(i.OwnerId, i.LibraryId, *i.CollectionId)
		if err != nil {
			return err
		}
		if collection == nil {
			msg := "collection not found"
			log.Error().Str("collectionId", *i.CollectionId).Msg(msg)
			return errors.New(msg)
		}
		i.CollectionName = &collection.Name
	} else {
		// Clearing collection
		i.CollectionName = nil
	}

	current := time.Now().UTC()
	i.UpdatedAt = &current

	err = s.db.UpdateLibraryItem(i)
	if err != nil {
		return err
	}

	// Handle collection item count changes
	oldCollectionId := ""
	newCollectionId := ""
	if currentItem.CollectionId != nil {
		oldCollectionId = *currentItem.CollectionId
	}
	if i.CollectionId != nil {
		newCollectionId = *i.CollectionId
	}

	if oldCollectionId != newCollectionId {
		// Item moved between collections
		if oldCollectionId != "" {
			err = s.db.IncrementCollectionItemCount(i.OwnerId, i.LibraryId, oldCollectionId, -1)
			if err != nil {
				log.Warn().Str("collectionId", oldCollectionId).Msgf("Failed to decrement collection item count: %s", err.Error())
			}
		}
		if newCollectionId != "" {
			err = s.db.IncrementCollectionItemCount(i.OwnerId, i.LibraryId, newCollectionId, 1)
			if err != nil {
				log.Warn().Str("collectionId", newCollectionId).Msgf("Failed to increment collection item count: %s", err.Error())
			}
		}
	}

	return nil
}

func (s *services) CreateItem(i *domain.LibraryItem) (*domain.LibraryItem, error) {
	i.Id = identifier.NewId()

	if i.PictureUrl != nil && *i.PictureUrl != "" {
		data, err := fetchPicture(*i.PictureUrl)
		if err != nil {
			return nil, err
		}

		// save picture into S3
		err = s.storage.PutPicture(i.OwnerId, i.LibraryId, i.Id, data)
		if err != nil {
			return nil, err
		}
	}

	library, err := s.db.GetLibrary(i.OwnerId, i.LibraryId)
	if err != nil {
		return nil, err
	}

	i.LibraryName = library.Name

	// If collectionId is provided, look up the collection to get the name
	if i.CollectionId != nil && *i.CollectionId != "" {
		collection, err := s.db.GetCollection(i.OwnerId, i.LibraryId, *i.CollectionId)
		if err != nil {
			return nil, err
		}
		if collection == nil {
			msg := "collection not found"
			log.Error().Str("collectionId", *i.CollectionId).Msg(msg)
			return nil, errors.New(msg)
		}
		i.CollectionName = &collection.Name
	}

	current := time.Now().UTC()
	i.UpdatedAt = &current

	err = s.db.PutLibraryItem(i)
	if err != nil {
		return nil, err
	}

	// Increment collection item count if item is in a collection
	if i.CollectionId != nil && *i.CollectionId != "" {
		err = s.db.IncrementCollectionItemCount(i.OwnerId, i.LibraryId, *i.CollectionId, 1)
		if err != nil {
			// Log but don't fail - eventual consistency via stream will fix this
			log.Warn().Str("collectionId", *i.CollectionId).Msgf("Failed to increment collection item count: %s", err.Error())
		}
	}

	return i, nil
}

func (s *services) ListItemsByLibrary(ownerId string, libraryId string, continuationToken string, pageSize int) (*domain.LibraryContent, error) {

	// Find if it is a shared library to the current requester
	sharedLibraryOwnerId, err := s.db.GetSharedLibrary(ownerId, libraryId)
	if err != nil {
		return nil, err
	}

	var libraryOwnerId string
	if sharedLibraryOwnerId != "" {
		libraryOwnerId = sharedLibraryOwnerId
	} else {
		libraryOwnerId = ownerId
	}

	content, err := s.db.QueryItemsByLibrary(libraryOwnerId, libraryId, continuationToken, pageSize)

	if err != nil {
		return nil, err
	}

	for _, i := range content.Items {
		if i.PictureUrl != nil && *i.PictureUrl != "" {
			pic, err := s.storage.GetPicture(libraryOwnerId, libraryId, i.Id)
			if err != nil {
				return nil, err
			}

			i.Picture = pic
		}
	}

	// On first page (no continuation token), include collections as items with type = ItemCollection
	// This ensures empty collections are visible and pagination still works correctly
	if continuationToken == "" {
		collections, err := s.db.QueryCollectionsByLibrary(libraryOwnerId, libraryId)
		if err != nil {
			// Log but don't fail - collections are optional
			log.Warn().Msgf("Failed to fetch collections: %s", err.Error())
		} else {
			// Prepend collections to items (they'll be sorted on the frontend)
			collectionItems := make([]*domain.LibraryItem, 0, len(collections))
			for _, c := range collections {
				collectionItems = append(collectionItems, &domain.LibraryItem{
					Id:        c.Id,
					Title:     c.Name,
					LibraryId: c.LibraryId,
					OwnerId:   c.OwnerId,
					Type:      domain.ItemCollection,
					Summary:   c.Description,
					UpdatedAt: c.UpdatedAt,
				})
			}
			content.Items = append(collectionItems, content.Items...)
		}
	}

	return content, nil
}

// ListItemsByLibraryGrouped returns library content with collections nested with their items.
// Server-side grouping ensures collections appear with all their items on each page.
// Items with Type=ItemCollection have their Items field populated with nested items.
func (s *services) ListItemsByLibraryGrouped(ownerId string, libraryId string, continuationToken string, pageSize int) (*domain.GroupedLibraryContent, error) {

	// Find if it is a shared library to the current requester
	sharedLibraryOwnerId, err := s.db.GetSharedLibrary(ownerId, libraryId)
	if err != nil {
		return nil, err
	}

	var libraryOwnerId string
	if sharedLibraryOwnerId != "" {
		libraryOwnerId = sharedLibraryOwnerId
	} else {
		libraryOwnerId = ownerId
	}

	content, err := s.db.QueryLibraryContentGrouped(libraryOwnerId, libraryId, continuationToken, pageSize)
	if err != nil {
		return nil, err
	}

	// Fetch S3 pictures for all items (both standalone and inside collections)
	for _, item := range content.Items {
		if item.Type == domain.ItemCollection {
			// Collection: fetch pictures for nested items
			for _, nestedItem := range item.Items {
				if nestedItem.PictureUrl != nil && *nestedItem.PictureUrl != "" {
					pic, err := s.storage.GetPicture(libraryOwnerId, libraryId, nestedItem.Id)
					if err != nil {
						return nil, err
					}
					nestedItem.Picture = pic
				}
			}
		} else {
			// Standalone book/video
			if item.PictureUrl != nil && *item.PictureUrl != "" {
				pic, err := s.storage.GetPicture(libraryOwnerId, libraryId, item.Id)
				if err != nil {
					return nil, err
				}
				item.Picture = pic
			}
		}
	}

	return content, nil
}
