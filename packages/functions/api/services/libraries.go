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

func (s *services) DeleteLibrary(l *domain.Library) error {
	libraryToDelete, err := s.db.GetLibrary(l.OwnerId, l.Id)
	if err != nil {
		return err
	}

	if len(libraryToDelete.SharedTo) != 0 {
		msg := "cannot delete shared library"
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

func (s *services) UnshareLibrary(sh *domain.UnshareLibrary) error {
	// Get the library to validate shared users
	library, err := s.db.GetLibrary(sh.SharedFromUserId, sh.LibraryId)
	if err != nil {
		return err
	}

	// Build set of users to remove for quick lookup
	toRemove := make(map[string]bool)
	for _, userName := range sh.SharedToUserNames {
		toRemove[userName] = true
	}

	// Validate all users are in sharedTo list and look up their IDs
	sh.SharedToUserIds = make([]string, 0, len(sh.SharedToUserNames))
	for _, userName := range sh.SharedToUserNames {
		if library.SharedTo == nil || slices.Index(library.SharedTo, userName) == -1 {
			msg := fmt.Sprintf("Library %s not shared with %s", sh.LibraryId, userName)
			log.Error().Msg(msg)
			return errors.New(msg)
		}

		userId, err := s.idp.GetUserIdFromUserName(userName)
		if err != nil {
			return err
		}
		sh.SharedToUserIds = append(sh.SharedToUserIds, userId)
	}

	// Compute the new sharedTo list by filtering out removed users
	sh.NewSharedToList = make([]string, 0)
	for _, userName := range library.SharedTo {
		if !toRemove[userName] {
			sh.NewSharedToList = append(sh.NewSharedToList, userName)
		}
	}

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
