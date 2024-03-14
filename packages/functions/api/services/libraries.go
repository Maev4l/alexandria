package services

import (
	"time"

	"alexandria.isnan.eu/functions/api/domain"
	"alexandria.isnan.eu/functions/internal/identifier"
)

func (s *services) CreateItem(i *domain.LibraryItem, pictureUrl *string) (*domain.LibraryItem, error) {
	i.Id = identifier.NewId()

	if pictureUrl != nil && *pictureUrl != "" {
		data, err := fetchPicture(*pictureUrl)
		if err != nil {
			return nil, err
		}

		// save picture into S3
		err = s.storage.PutPicture(i.OwnerId, i.LibraryId, i.Id, data)
		if err != nil {
			return nil, err
		}
	}

	library, err := s.db.GetLibrary(i.OwnerId, i.LibraryId)
	if err != nil {
		return nil, err
	}

	i.LibraryName = library.Name

	current := time.Now().UTC()
	i.UpdatedAt = &current

	err = s.db.PutLibraryItem(i)
	if err != nil {
		return nil, err
	}

	return i, nil
}

func (s *services) ListItems(ownerId string, libraryId string, continuationToken string, pageSize int) (*domain.LibraryContent, error) {

	content, err := s.db.QueryLibraryItems(ownerId, libraryId, continuationToken, pageSize)

	if err != nil {
		return nil, err
	}

	for _, i := range content.Items {

		pic, err := s.storage.GetPicture(ownerId, libraryId, i.Id)
		if err != nil {
			return nil, err
		}

		i.Picture = pic
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
