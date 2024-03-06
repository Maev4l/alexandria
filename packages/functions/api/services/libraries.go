package services

import (
	"cmp"
	"slices"
	"strings"
	"time"

	"alexandria.isnan.eu/functions/api/domain"
	"alexandria.isnan.eu/functions/internal/identifier"
)

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
	slices.SortFunc(res, func(a, b domain.Library) int {
		// Sort by library name
		r := cmp.Compare(strings.ToLower(a.Name), strings.ToLower(b.Name))
		if r != 0 {
			return r
		}

		// Otherwise, sort by creation / update date
		if a.UpdatedAt.After(*b.UpdatedAt) {
			return -1
		} else if a.UpdatedAt.Before(*b.UpdatedAt) {
			return 1
		}

		return 0
	})

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
