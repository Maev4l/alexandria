package services

import (
	"time"

	"alexandria.isnan.eu/functions/api/domain"
	"alexandria.isnan.eu/functions/internal/identifier"
)

func (s *services) ListLibraryItems(ownerId string, libraryId string, continuationToken string, pageSize int) (*domain.LibraryContent, error) {

	content, err := s.db.QueryLibraryItems(ownerId, libraryId, continuationToken, pageSize)
	// TODO: Fetch items thumbnails
	if err != nil {
		return nil, err
	}

	return content, nil
}

func (s *services) DeleteLibrary(l *domain.Library) error {
	err := s.db.DeleteLibrary(l)

	// TODO:
	// Remove thumbnails in S3
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
