package ports

import (
	"alexandria.isnan.eu/functions/api/domain"
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
	UpdateItem(i *domain.LibraryItem) error
	ShareLibrary(sh *domain.ShareLibrary) error
}
