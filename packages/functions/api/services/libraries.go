package services

import (
	"time"

	"alexandria.isnan.eu/functions/api/domain"
	"alexandria.isnan.eu/functions/internal/identifier"
	"github.com/rs/zerolog/log"
)

func (s *services) ListLibraries(ownerId string) ([]domain.Library, error) {
	return s.db.QueryLibraries(ownerId)
}

func (s *services) CreateLibrary(l *domain.Library) (*domain.Library, error) {

	current := time.Now().UTC()

	l.Id = identifier.NewId()
	l.UpdatedAt = &current

	err := s.db.SaveLibrary(l)
	if err != nil {
		log.Error().Msgf("Failed to create library (name: %s): %s", l.Name, err.Error())
		return nil, err
	}

	return l, nil
}
