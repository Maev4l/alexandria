package services

import (
	"errors"
	"fmt"
	"time"

	"alexandria.isnan.eu/functions/internal/domain"
	"alexandria.isnan.eu/functions/internal/identifier"
	"github.com/rs/zerolog/log"
)

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
		msg := fmt.Sprintf("Item already lent")
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
		msg := fmt.Sprintf("Item not lent")
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

	err := s.db.DeleteLibraryItem(i)
	if err != nil {
		return err
	}
	err = s.storage.DeletePicture(i.OwnerId, i.LibraryId, i.Id)
	if err != nil {
		return err
	}
	return nil
}

func (s *services) UpdateItem(i *domain.LibraryItem) error {

	library, err := s.db.GetLibrary(i.OwnerId, i.LibraryId)
	if err != nil {
		return err
	}

	if library.OwnerId != i.OwnerId {
		msg := fmt.Sprintf("Library %s does not belong to user", i.LibraryId)
		log.Error().Msg(msg)
		return errors.New(msg)
	}

	if i.PictureUrl != nil && *i.PictureUrl != "" {
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

	current := time.Now().UTC()
	i.UpdatedAt = &current

	err = s.db.UpdateLibraryItem(i)
	if err != nil {
		return err
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

	current := time.Now().UTC()
	i.UpdatedAt = &current

	err = s.db.PutLibraryItem(i)
	if err != nil {
		return nil, err
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

	return content, nil
}
