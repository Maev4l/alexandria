package ports

import (
	"alexandria.isnan.eu/functions/api/domain"
)

type Database interface {
	PutLibrary(l *domain.Library) error
	UpdateLibrary(l *domain.Library) error
	DeleteLibrary(l *domain.Library) error
	GetLibrary(ownerId string, libraryId string) (*domain.Library, error)
	QueryLibraries(ownerId string) ([]domain.Library, error)
	QueryItemsByLibrary(ownerId string, libraryId string, continuationToken string, pageSize int) (*domain.LibraryContent, error)
	PutLibraryItem(i *domain.LibraryItem) error
	DeleteLibraryItem(i *domain.LibraryItem) error
}
