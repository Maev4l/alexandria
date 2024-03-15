package handlers

import (
	"encoding/base64"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"alexandria.isnan.eu/functions/api/domain"
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

		if len(item.Summary) > 2000 {
			return errors.New("Invalid request - Summary too long (max. 2000 chars)")
		}
	}

	return nil
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
		Title:     strings.TrimSpace(request.Title),
		Summary:   strings.TrimSpace(request.Summary),
		Isbn:      strings.TrimSpace(request.Isbn),
		Authors:   slices.Map(request.Authors, func(a string) string { return strings.TrimSpace(a) }),
		LibraryId: libraryId,
		OwnerId:   t.userId,
		OwnerName: t.displayName,
		Type:      domain.ItemBook,
	}

	err = h.validateItemPayload(&item)

	if err != nil {
		log.Error().Msg(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	result, err := h.s.CreateItem(&item, request.PictureUrl)
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
					Id:    i.Id,
					Type:  domain.ItemBook,
					Title: i.Title,
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
