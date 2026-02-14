package ports

import (
	"alexandria.isnan.eu/functions/internal/domain"
)

type BookResolver interface {
	Resolve(code string, ch chan []domain.ResolvedBook)
	Name() string
}

type Services interface {
	ResolveBook(code string) []domain.ResolvedBook
	CreateLibrary(l *domain.Library) (*domain.Library, error)
	UpdateLibrary(l *domain.Library) error
	DeleteLibrary(l *domain.Library) error
	ListLibraries(ownerId string) ([]domain.Library, error)
	ListItemsByLibrary(ownerId string, libraryId string, continuationToken string, pageSize int) (*domain.LibraryContent, error)
	CreateItem(i *domain.LibraryItem) (*domain.LibraryItem, error)
	DeleteItem(i *domain.LibraryItem) error
	UpdateItem(i *domain.LibraryItem, fetchPicture bool) error
	ShareLibrary(sh *domain.ShareLibrary) error
	UnshareLibrary(sh *domain.UnshareLibrary) error
	SearchItems(ownerId string, terms []string) ([]*domain.LibraryItem, error)
	LendItem(ownerId string, libraryId string, itemId string, lendTo string) error
	ReturnItem(ownerId string, libraryId string, itemId string, from string) error
	GetLibraryItemHistory(ownerId string, libraryId string, itemId string, continuationToken string, pageSize int) (*domain.ItemHistory, error)
	DeleteLibraryItemHistory(ownerId string, libraryId string, itemId string) error
}
