// Edited by Claude.
package services

import (
	"errors"
	"time"

	"alexandria.isnan.eu/functions/internal/domain"
	"alexandria.isnan.eu/functions/internal/identifier"
	"github.com/rs/zerolog/log"
)

// CreateCollection creates a new collection in a library
// Enforces unique collection names within a library
func (s *services) CreateCollection(c *domain.Collection) (*domain.Collection, error) {
	// Check for duplicate name
	existing, err := s.db.GetCollectionByName(c.OwnerId, c.LibraryId, c.Name)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		msg := "collection with this name already exists"
		log.Error().Str("name", c.Name).Msg(msg)
		return nil, errors.New(msg)
	}

	current := time.Now().UTC()
	c.Id = identifier.NewId()
	c.CreatedAt = &current
	c.UpdatedAt = &current
	c.ItemCount = 0

	err = s.db.PutCollection(c)
	if err != nil {
		return nil, err
	}

	return c, nil
}

// UpdateCollection updates an existing collection
// Checks for name uniqueness if the name is being changed
func (s *services) UpdateCollection(c *domain.Collection) error {
	// Get current collection to check if name is changing
	current, err := s.db.GetCollection(c.OwnerId, c.LibraryId, c.Id)
	if err != nil {
		return err
	}
	if current == nil {
		msg := "collection not found"
		log.Error().Str("id", c.Id).Msg(msg)
		return errors.New(msg)
	}

	// If name is changing, check for uniqueness
	if current.Name != c.Name {
		existing, err := s.db.GetCollectionByName(c.OwnerId, c.LibraryId, c.Name)
		if err != nil {
			return err
		}
		if existing != nil {
			msg := "collection with this name already exists"
			log.Error().Str("name", c.Name).Msg(msg)
			return errors.New(msg)
		}
	}

	now := time.Now().UTC()
	c.UpdatedAt = &now

	return s.db.UpdateCollection(c)
}

// DeleteCollection removes a collection
// Items in the collection will be orphaned by the consistency-manager
func (s *services) DeleteCollection(c *domain.Collection) error {
	return s.db.DeleteCollection(c)
}

// GetCollection retrieves a collection by ID
func (s *services) GetCollection(ownerId string, libraryId string, collectionId string) (*domain.Collection, error) {
	return s.db.GetCollection(ownerId, libraryId, collectionId)
}

// ListCollectionsByLibrary returns all collections in a library
func (s *services) ListCollectionsByLibrary(ownerId string, libraryId string) ([]domain.Collection, error) {
	return s.db.QueryCollectionsByLibrary(ownerId, libraryId)
}
