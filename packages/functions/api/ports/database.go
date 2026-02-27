package ports

import (
	"time"

	"alexandria.isnan.eu/functions/internal/domain"
)

type Database interface {
	PutLibrary(l *domain.Library) error
	UpdateLibrary(l *domain.Library) error
	DeleteLibrary(l *domain.Library) error
	GetLibrary(ownerId string, libraryId string) (*domain.Library, error)
	QueryLibraries(ownerId string) ([]domain.Library, error)
	QueryItemsByLibrary(ownerId string, libraryId string, continuationToken string, pageSize int) (*domain.LibraryContent, error)
	PutLibraryItem(i *domain.LibraryItem) error
	UpdateLibraryItem(i *domain.LibraryItem) error
	DeleteLibraryItem(i *domain.LibraryItem) error
	ShareLibrary(s *domain.ShareLibrary) error
	UnshareLibrary(s *domain.UnshareLibrary) error
	GetLibraryItem(ownerId string, libraryId string, itemId string) (*domain.LibraryItem, error)
	GetSharedLibrary(ownerId string, libraryId string) (string, error)
	GetMatchedItems([]domain.IndexItem) ([]*domain.LibraryItem, error)
	PutItemEvent(i *domain.LibraryItem, evtType domain.ItemEventType, evt string, date *time.Time) error
	QueryItemEvents(i *domain.LibraryItem, continuationToken string, pageSize int) (*domain.ItemHistory, error)
	DeleteItemEvents(i *domain.LibraryItem) error
	// Collection methods
	PutCollection(c *domain.Collection) error
	UpdateCollection(c *domain.Collection) error
	DeleteCollection(c *domain.Collection) error
	GetCollection(ownerId string, libraryId string, collectionId string) (*domain.Collection, error)
	GetCollectionByName(ownerId string, libraryId string, name string) (*domain.Collection, error)
	QueryCollectionsByLibrary(ownerId string, libraryId string) ([]domain.Collection, error)
	IncrementCollectionItemCount(ownerId string, libraryId string, collectionId string, delta int) error
}
