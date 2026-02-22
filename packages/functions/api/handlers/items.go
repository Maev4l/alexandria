package handlers

import (
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"alexandria.isnan.eu/functions/internal/domain"
	"alexandria.isnan.eu/functions/internal/slices"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

func (h *HTTPHandler) validateItemPayload(item *domain.LibraryItem) error {
	// Common validation for all item types
	if len(item.Title) == 0 {
		return errors.New("invalid request - item title is mandatory")
	}

	if len(item.Title) > 100 {
		return errors.New("invalid request - title too long (max. 100 chars)")
	}

	if len(item.Summary) > 4000 {
		return errors.New("invalid request - summary too long (max. 4000 chars)")
	}

	// Collection validation (applies to all item types)
	if item.Collection == nil && item.Order != nil {
		return errors.New("invalid request - collection name must be specified")
	}

	if item.Collection != nil {
		if len(*item.Collection) == 0 || len(*item.Collection) > 100 {
			return fmt.Errorf("invalid request - invalid collection name (1-100 chars): %d chars", len(*item.Collection))
		}

		if item.Order == nil {
			return errors.New("invalid request - collection order must be specified")
		}

		// Order must be positive (1-1000) for correct GSI1SK sorting with %05d padding
		if *item.Order < 1 || *item.Order > 1000 {
			return errors.New("invalid request - invalid collection order (must be between 1 and 1000)")
		}
	}

	// Video-specific validation
	if item.Type == domain.ItemVideo {
		for _, d := range item.Directors {
			if len(d) > 100 {
				return errors.New("invalid request - director name too long (max. 100 chars)")
			}
		}

		if item.ReleaseYear != nil && (*item.ReleaseYear < 1800 || *item.ReleaseYear > 2100) {
			return errors.New("invalid request - invalid release year")
		}

		if item.Duration != nil && (*item.Duration < 0 || *item.Duration > 1000) {
			return errors.New("invalid request - invalid duration (must be between 0 and 1000 minutes)")
		}
	}

	return nil
}

func (h *HTTPHandler) CreateItemHistoryEvent(c *gin.Context) {
	libraryId := c.Param("libraryId")
	itemId := c.Param("itemId")

	var request ItemHistoryEntryRequest
	err := c.BindJSON(&request)
	if err != nil {
		log.Error().Msgf("Invalid request: %s", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request.",
		})
		return
	}

	if len(request.Event) > 50 {
		log.Error().Msgf("Name too long")
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Name too long.",
		})
		return
	}

	if len(request.Event) == 0 {
		log.Error().Msgf("Name missing")
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Name missing.",
		})
		return
	}

	t := h.getTokenInfo(c)

	if request.Type == domain.Lent {

		err = h.s.LendItem(t.userId, libraryId, itemId, strings.TrimSpace(request.Event))
	}

	if request.Type == domain.Returned {
		err = h.s.ReturnItem(t.userId, libraryId, itemId, strings.TrimSpace(request.Event))
	}

	if err != nil {
		log.Error().Msg(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	c.Status(http.StatusCreated)

}

func (h *HTTPHandler) DeleteItemHistoryEvents(c *gin.Context) {
	libraryId := c.Param("libraryId")
	itemId := c.Param("itemId")

	t := h.getTokenInfo(c)

	err := h.s.DeleteLibraryItemHistory(t.userId, libraryId, itemId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to delete item history",
		})
		return
	}

	c.Status(http.StatusOK)
}

func (h *HTTPHandler) GetItemHistoryEvents(c *gin.Context) {
	libraryId := c.Param("libraryId")
	itemId := c.Param("itemId")
	continuationToken := c.Query("nextToken")
	limit := c.DefaultQuery("limit", "10")
	pageSize, err := strconv.Atoi(limit)
	if err != nil {
		pageSize = 10
	}

	if pageSize > 20 {
		pageSize = 20
	}
	t := h.getTokenInfo(c)

	history, err := h.s.GetLibraryItemHistory(t.userId, libraryId, itemId, continuationToken, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to query item history",
		})
		return
	}

	entries := []ItemHistoryEntry{}

	for _, e := range history.Entries {
		entries = append(entries, ItemHistoryEntry{
			Date:  e.Date,
			Type:  e.Type,
			Event: e.Event,
		})
	}

	response := ItemHistoryEntryListResponse{
		Entries:           entries,
		ContinuationToken: history.ContinuationToken,
	}

	c.JSON(http.StatusOK, response)
}

func (h *HTTPHandler) UpdateBook(c *gin.Context) {
	libraryId := c.Param("libraryId")
	bookId := c.Param("bookId")

	var request UpdateBookRequest
	err := c.BindJSON(&request)
	if err != nil {
		log.Error().Msgf("Invalid request: %s", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request.",
		})
		return
	}

	t := h.getTokenInfo(c)

	// Order = 0 means no order has been set
	if request.Order != nil && *request.Order == 0 {
		request.Order = nil
	}

	// Empty collection name means no collection has been set
	if request.Collection != nil && *request.Collection == "" {
		request.Collection = nil
	}

	item := domain.LibraryItem{
		Id:         bookId,
		Title:      strings.TrimSpace(request.Title),
		LibraryId:  libraryId,
		OwnerId:    t.userId,
		OwnerName:  t.userName,
		Summary:    strings.TrimSpace(request.Summary),
		Isbn:       strings.TrimSpace(request.Isbn),
		Authors:    slices.Map(request.Authors, func(a string) string { return strings.TrimSpace(a) }),
		Type:       domain.ItemBook,
		PictureUrl: request.PictureUrl,
		Collection: request.Collection,
		Order:      request.Order,
	}

	err = h.validateItemPayload(&item)

	var collectionStr string
	if request.Collection != nil {
		collectionStr = strings.TrimSpace(*request.Collection)
		item.Collection = &collectionStr
	}

	if err != nil {
		log.Error().Msg(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	fetchPicture := request.UpdatePicture != nil && *request.UpdatePicture

	err = h.s.UpdateItem(&item, fetchPicture)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to update item",
		})
		return
	}
	c.Status(http.StatusOK)
}

func (h *HTTPHandler) DeleteItem(c *gin.Context) {
	libraryId := c.Param("libraryId")
	itemId := c.Param("itemId")

	t := h.getTokenInfo(c)

	item := domain.LibraryItem{
		OwnerId:   t.userId,
		LibraryId: libraryId,
		Id:        itemId,
	}

	err := h.s.DeleteItem(&item)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to delete item",
		})
		return
	}

	c.Status(http.StatusOK)
}

func (h *HTTPHandler) CreateBook(c *gin.Context) {
	libraryId := c.Param("libraryId")

	var request CreateBookRequest
	err := c.BindJSON(&request)
	if err != nil {
		log.Error().Msgf("Invalid request: %s", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request.",
		})
		return
	}

	t := h.getTokenInfo(c)

	// Order = 0 means no order has been set
	if request.Order != nil && *request.Order == 0 {
		request.Order = nil
	}

	// Empty collection name means no collection has been set
	if request.Collection != nil && *request.Collection == "" {
		request.Collection = nil
	}

	item := domain.LibraryItem{
		Title:      strings.TrimSpace(request.Title),
		Summary:    strings.TrimSpace(request.Summary),
		Isbn:       strings.TrimSpace(request.Isbn),
		Authors:    slices.Map(request.Authors, func(a string) string { return strings.TrimSpace(a) }),
		LibraryId:  libraryId,
		OwnerId:    t.userId,
		OwnerName:  t.displayName,
		Type:       domain.ItemBook,
		PictureUrl: request.PictureUrl,
		Collection: request.Collection,
		Order:      request.Order,
	}

	err = h.validateItemPayload(&item)

	var collectionStr string
	if request.Collection != nil {
		collectionStr = strings.TrimSpace(*request.Collection)
		item.Collection = &collectionStr
	}

	if err != nil {
		log.Error().Msg(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	result, err := h.s.CreateItem(&item)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to create item",
		})
		return
	}

	c.JSON(http.StatusOK, &CreateBookResponse{
		Id:        result.Id,
		UpdatedAt: result.UpdatedAt,
	})

}

// CreateVideo handles video creation
func (h *HTTPHandler) CreateVideo(c *gin.Context) {
	libraryId := c.Param("libraryId")

	var request CreateVideoRequest
	err := c.BindJSON(&request)
	if err != nil {
		log.Error().Msgf("Invalid request: %s", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request.",
		})
		return
	}

	t := h.getTokenInfo(c)

	// Order = 0 means no order has been set
	if request.Order != nil && *request.Order == 0 {
		request.Order = nil
	}

	// Empty collection name means no collection has been set
	if request.Collection != nil && *request.Collection == "" {
		request.Collection = nil
	}

	item := domain.LibraryItem{
		Title:       strings.TrimSpace(request.Title),
		Summary:     strings.TrimSpace(request.Summary),
		LibraryId:   libraryId,
		OwnerId:     t.userId,
		OwnerName:   t.displayName,
		Type:        domain.ItemVideo,
		PictureUrl:  request.PictureUrl,
		Collection:  request.Collection,
		Order:       request.Order,
		Directors:   slices.Map(request.Directors, func(d string) string { return strings.TrimSpace(d) }),
		Cast:        slices.Map(request.Cast, func(c string) string { return strings.TrimSpace(c) }),
		ReleaseYear: request.ReleaseYear,
		Duration:    request.Duration,
		TmdbId:      request.TmdbId,
	}

	// Trim collection if provided
	if request.Collection != nil {
		collectionStr := strings.TrimSpace(*request.Collection)
		item.Collection = &collectionStr
	}

	err = h.validateItemPayload(&item)
	if err != nil {
		log.Error().Msg(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	result, err := h.s.CreateItem(&item)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to create video",
		})
		return
	}

	c.JSON(http.StatusOK, &CreateVideoResponse{
		Id:        result.Id,
		UpdatedAt: result.UpdatedAt,
	})
}

// UpdateVideo handles video updates
func (h *HTTPHandler) UpdateVideo(c *gin.Context) {
	libraryId := c.Param("libraryId")
	videoId := c.Param("videoId")

	var request UpdateVideoRequest
	err := c.BindJSON(&request)
	if err != nil {
		log.Error().Msgf("Invalid request: %s", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request.",
		})
		return
	}

	t := h.getTokenInfo(c)

	// Order = 0 means no order has been set
	if request.Order != nil && *request.Order == 0 {
		request.Order = nil
	}

	// Empty collection name means no collection has been set
	if request.Collection != nil && *request.Collection == "" {
		request.Collection = nil
	}

	item := domain.LibraryItem{
		Id:          videoId,
		Title:       strings.TrimSpace(request.Title),
		LibraryId:   libraryId,
		OwnerId:     t.userId,
		OwnerName:   t.userName,
		Summary:     strings.TrimSpace(request.Summary),
		Type:        domain.ItemVideo,
		PictureUrl:  request.PictureUrl,
		Collection:  request.Collection,
		Order:       request.Order,
		Directors:   slices.Map(request.Directors, func(d string) string { return strings.TrimSpace(d) }),
		Cast:        slices.Map(request.Cast, func(c string) string { return strings.TrimSpace(c) }),
		ReleaseYear: request.ReleaseYear,
		Duration:    request.Duration,
		TmdbId:      request.TmdbId,
	}

	// Trim collection if provided
	if request.Collection != nil {
		collectionStr := strings.TrimSpace(*request.Collection)
		item.Collection = &collectionStr
	}

	err = h.validateItemPayload(&item)
	if err != nil {
		log.Error().Msg(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	fetchPicture := request.UpdatePicture != nil && *request.UpdatePicture

	err = h.s.UpdateItem(&item, fetchPicture)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to update video",
		})
		return
	}
	c.Status(http.StatusOK)
}

func (h *HTTPHandler) ListLibraryItems(c *gin.Context) {

	libraryId := c.Param("libraryId")
	continuationToken := c.Query("nextToken")
	limit := c.DefaultQuery("limit", "10")
	pageSize, err := strconv.Atoi(limit)
	if err != nil {
		pageSize = 10
	}

	if pageSize > 20 {
		pageSize = 20
	}

	t := h.getTokenInfo(c)

	items, err := h.s.ListItemsByLibrary(t.userId, libraryId, continuationToken, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to query library items ",
		})
		return
	}

	itemsResponse := []GetItemResponse{}

	for _, i := range items.Items {
		var encodedPicture *string
		if i.Picture != nil {
			encoded := base64.StdEncoding.EncodeToString(i.Picture)
			encodedPicture = &encoded
		}

		baseResponse := GetItemResponseBase{
			Id:          i.Id,
			Type:        i.Type,
			Title:       i.Title,
			Picture:     encodedPicture,
			LibraryId:   &i.LibraryId,
			LibraryName: &i.LibraryName,
			LentTo:      i.LentTo,
			OwnerId:     i.OwnerId,
			Collection:  i.Collection,
			Order:       i.Order,
			PictureUrl:  i.PictureUrl,
		}

		switch i.Type {
		case domain.ItemBook:
			itemsResponse = append(itemsResponse, GetBookResponse{
				GetItemResponseBase: baseResponse,
				Authors:             i.Authors,
				Summary:             i.Summary,
				Isbn:                i.Isbn,
			})
		case domain.ItemVideo:
			itemsResponse = append(itemsResponse, GetVideoResponse{
				GetItemResponseBase: baseResponse,
				Directors:           i.Directors,
				Cast:                i.Cast,
				Summary:             i.Summary,
				ReleaseYear:         i.ReleaseYear,
				Duration:            i.Duration,
				TmdbId:              i.TmdbId,
			})
		}
	}

	response := GetLibrariesContentResponse{
		GetItemsResponse:  itemsResponse,
		ContinuationToken: items.ContinuationToken,
	}

	c.JSON(http.StatusOK, response)
}
