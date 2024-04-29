package handlers

import (
	"encoding/base64"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"alexandria.isnan.eu/functions/internal/domain"
	"alexandria.isnan.eu/functions/internal/slices"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

func (h *HTTPHandler) validateItemPayload(item *domain.LibraryItem) error {
	if item.Type == domain.ItemBook {
		if len(item.Title) == 0 {
			return errors.New("Invalid request - Item title is mandatory")
		}

		if len(item.Title) > 100 {
			return errors.New("Invalid request - Title too long (max. 100 chars)")
		}

		if len(item.Summary) > 4000 {
			return errors.New("Invalid request - Summary too long (max. 4000 chars)")
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
	}

	err = h.validateItemPayload(&item)

	if err != nil {
		log.Error().Msg(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	err = h.s.UpdateItem(&item)
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
			"message": "Failed to create item",
		})
		return
	}

	c.JSON(http.StatusOK, &CreateBookResponse{
		Id:        result.Id,
		UpdatedAt: result.UpdatedAt,
	})

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
		if i.Type == domain.ItemBook {
			b := GetBookResponse{
				GetItemResponseBase: GetItemResponseBase{
					Id:         i.Id,
					Type:       domain.ItemBook,
					Title:      i.Title,
					LibraryId:  &i.LibraryId,
					LibrayName: &i.LibraryName,
					LentTo:     i.LentTo,
					OwnerId:    i.OwnerId,
				},
				Authors: i.Authors,
				Summary: i.Summary,
				Isbn:    i.Isbn,
			}
			if i.Picture != nil {
				encodedPicture := base64.StdEncoding.EncodeToString(i.Picture)
				b.Picture = &encodedPicture
			}
			itemsResponse = append(itemsResponse, b)
		}
	}

	response := GetLibrariesContentResponse{
		GetItemsResponse:  itemsResponse,
		ContinuationToken: items.ContinuationToken,
	}

	c.JSON(http.StatusOK, response)
}
