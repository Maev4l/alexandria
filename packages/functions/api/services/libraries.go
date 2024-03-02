package services

import (
	"time"

	"alexandria.isnan.eu/functions/api/domain"
	"alexandria.isnan.eu/functions/internal/identifier"
)

func (s *services) CreateLibrary(l *domain.Library) (*domain.Library, error) {

	current := time.Now().UTC()

	l.Id = identifier.NewId()
	l.UpdatedAt = &current

	err := s.db.SaveLibrary(l)
	if err != nil {
		return nil, err
	}

	return l, nil
}
