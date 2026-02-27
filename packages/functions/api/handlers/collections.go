// Edited by Claude.
package handlers

import (
	"errors"
	"net/http"
	"strings"

	"alexandria.isnan.eu/functions/internal/domain"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

// Collection request/response models

type CreateCollectionRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type CreateCollectionResponse struct {
	Id string `json:"id"`
}

type UpdateCollectionRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type GetCollectionResponse struct {
	Id          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	ItemCount   int    `json:"itemCount"`
}

type GetCollectionsResponse struct {
	Collections []GetCollectionResponse `json:"collections"`
}

func (h *HTTPHandler) validateCollectionPayload(c *domain.Collection) error {
	if len(c.Name) == 0 {
		return errors.New("invalid request - collection name is mandatory")
	}

	if len(c.Name) > 100 {
		return errors.New("invalid request - name too long (max. 100 chars)")
	}

	if len(c.Description) > 500 {
		return errors.New("invalid request - description too long (max. 500 chars)")
	}

	return nil
}

// ListCollections returns all collections in a library
func (h *HTTPHandler) ListCollections(c *gin.Context) {
	libraryId := c.Param("libraryId")
	t := h.getTokenInfo(c)

	collections, err := h.s.ListCollectionsByLibrary(t.userId, libraryId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to list collections",
		})
		return
	}

	list := []GetCollectionResponse{}
	for _, col := range collections {
		list = append(list, GetCollectionResponse{
			Id:          col.Id,
			Name:        col.Name,
			Description: col.Description,
			ItemCount:   col.ItemCount,
		})
	}

	c.JSON(http.StatusOK, GetCollectionsResponse{
		Collections: list,
	})
}

// CreateCollection creates a new collection in a library
func (h *HTTPHandler) CreateCollection(c *gin.Context) {
	libraryId := c.Param("libraryId")

	var request CreateCollectionRequest
	err := c.BindJSON(&request)
	if err != nil {
		log.Error().Msgf("Invalid request: %s", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request.",
		})
		return
	}

	t := h.getTokenInfo(c)

	collection := domain.Collection{
		Name:        strings.TrimSpace(request.Name),
		Description: strings.TrimSpace(request.Description),
		OwnerId:     t.userId,
		LibraryId:   libraryId,
	}

	err = h.validateCollectionPayload(&collection)
	if err != nil {
		log.Error().Msg(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	result, err := h.s.CreateCollection(&collection)
	if err != nil {
		// Check if it's a duplicate name error
		if strings.Contains(err.Error(), "already exists") {
			c.JSON(http.StatusConflict, gin.H{
				"message": err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to create collection",
		})
		return
	}

	c.JSON(http.StatusCreated, CreateCollectionResponse{
		Id: result.Id,
	})
}

// GetCollection returns a single collection
func (h *HTTPHandler) GetCollection(c *gin.Context) {
	libraryId := c.Param("libraryId")
	collectionId := c.Param("collectionId")
	t := h.getTokenInfo(c)

	collection, err := h.s.GetCollection(t.userId, libraryId, collectionId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to get collection",
		})
		return
	}

	if collection == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"message": "Collection not found",
		})
		return
	}

	c.JSON(http.StatusOK, GetCollectionResponse{
		Id:          collection.Id,
		Name:        collection.Name,
		Description: collection.Description,
		ItemCount:   collection.ItemCount,
	})
}

// UpdateCollection updates an existing collection
func (h *HTTPHandler) UpdateCollection(c *gin.Context) {
	libraryId := c.Param("libraryId")
	collectionId := c.Param("collectionId")

	var request UpdateCollectionRequest
	err := c.BindJSON(&request)
	if err != nil {
		log.Error().Msgf("Invalid request: %s", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request.",
		})
		return
	}

	t := h.getTokenInfo(c)

	collection := domain.Collection{
		Id:          collectionId,
		Name:        strings.TrimSpace(request.Name),
		Description: strings.TrimSpace(request.Description),
		OwnerId:     t.userId,
		LibraryId:   libraryId,
	}

	err = h.validateCollectionPayload(&collection)
	if err != nil {
		log.Error().Msg(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	err = h.s.UpdateCollection(&collection)
	if err != nil {
		// Check if it's a duplicate name error
		if strings.Contains(err.Error(), "already exists") {
			c.JSON(http.StatusConflict, gin.H{
				"message": err.Error(),
			})
			return
		}
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{
				"message": err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to update collection",
		})
		return
	}

	c.Status(http.StatusOK)
}

// DeleteCollection removes a collection
func (h *HTTPHandler) DeleteCollection(c *gin.Context) {
	libraryId := c.Param("libraryId")
	collectionId := c.Param("collectionId")
	t := h.getTokenInfo(c)

	collection := domain.Collection{
		Id:        collectionId,
		OwnerId:   t.userId,
		LibraryId: libraryId,
	}

	err := h.s.DeleteCollection(&collection)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to delete collection",
		})
		return
	}

	c.Status(http.StatusOK)
}
