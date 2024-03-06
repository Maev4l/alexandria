package ports

import (
	"alexandria.isnan.eu/functions/api/domain"
)

type Database interface {
	PutLibrary(l *domain.Library) error
	UpdateLibrary(l *domain.Library) error
	QueryLibraries(ownerId string) ([]domain.Library, error)
}
