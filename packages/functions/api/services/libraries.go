package services

import (
	"errors"
	"fmt"
	"slices"
	"time"

	"alexandria.isnan.eu/functions/internal/domain"
	"alexandria.isnan.eu/functions/internal/identifier"
	"github.com/rs/zerolog/log"
)

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

func (s *services) DeleteLibrary(l *domain.Library) error {
	libraryToDelete, err := s.db.GetLibrary(l.OwnerId, l.Id)
	if err != nil {
		return err
	}

	if len(libraryToDelete.SharedTo) != 0 {
		msg := fmt.Sprintf("Cannot delete shared library.")
		log.Error().Msg(msg)
		return errors.New(msg)
	}

	err = s.db.DeleteLibrary(l)

	if err != nil {
		return err
	}

	err = s.storage.DeletePictures(l.OwnerId, l.Id)
	if err != nil {
		return err
	}
	return nil
}

func (s *services) UpdateLibrary(l *domain.Library) error {

	current := time.Now().UTC()
	l.UpdatedAt = &current

	err := s.db.UpdateLibrary(l)

	if err != nil {
		return err
	}

	return nil
}

func (s *services) ListLibraries(ownerId string) ([]domain.Library, error) {

	res, err := s.db.QueryLibraries(ownerId)

	return res, err
}

func (s *services) CreateLibrary(l *domain.Library) (*domain.Library, error) {

	current := time.Now().UTC()

	l.Id = identifier.NewId()
	l.UpdatedAt = &current

	err := s.db.PutLibrary(l)
	if err != nil {
		return nil, err
	}

	return l, nil
}

func (s *services) UnshareLibrary(sh *domain.ShareLibrary) error {
	userIdTo, err := s.idp.GetUserIdFromUserName(sh.SharedToUserName)
	if err != nil {
		return err
	}

	libraryToShare, err := s.db.GetLibrary(sh.SharedFromUserId, sh.LibraryId)
	if err != nil {
		return err
	}

	var i int
	if libraryToShare.SharedTo != nil {
		i = slices.Index(libraryToShare.SharedTo, sh.SharedToUserName)
		if i == -1 {
			msg := fmt.Sprintf("Library %s not shared with %s", sh.LibraryId, sh.SharedToUserName)
			log.Error().Msg(msg)
			return errors.New(msg)
		}
	}

	sh.SharedToUserId = userIdTo
	sh.SharedToUserIndex = i
	err = s.db.UnshareLibrary(sh)
	if err != nil {
		return err
	}
	return nil
}

func (s *services) ShareLibrary(sh *domain.ShareLibrary) error {
	userIdTo, err := s.idp.GetUserIdFromUserName(sh.SharedToUserName)
	if err != nil {
		return err
	}

	libraryToShare, err := s.db.GetLibrary(sh.SharedFromUserId, sh.LibraryId)
	if err != nil {
		return err
	}

	if libraryToShare.SharedTo != nil {
		i := slices.Index(libraryToShare.SharedTo, sh.SharedToUserName)
		if i != -1 {
			msg := fmt.Sprintf("Library %s already shared with %s", sh.LibraryId, sh.SharedToUserName)
			log.Error().Msg(msg)
			return errors.New(msg)
		}
	}

	current := time.Now().UTC()
	sh.SharedToUserId = userIdTo
	sh.UpdatedAt = &current

	err = s.db.ShareLibrary(sh)
	if err != nil {
		return err
	}
	return nil
}
