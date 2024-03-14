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

func (h *HTTPHandler) validateLibraryPayload(library *domain.Library) error {

	if len(library.Name) == 0 {
		return errors.New("Invalid request - Library name is mandatory")
	}

	if len(library.Name) > 20 {
		return errors.New("Invalid request - Name too long (max. 20 chars)")
	}

	if len(library.Description) > 100 {
		return errors.New("Invalid request - Description too long (max. 100 chars)")
	}
	return nil
}

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

	items, err := h.s.ListItems(t.userId, libraryId, continuationToken, pageSize)
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

func (h *HTTPHandler) DeleteLibrary(c *gin.Context) {
	libraryId := c.Param("libraryId")

	t := h.getTokenInfo(c)

	library := domain.Library{
		Id:      libraryId,
		OwnerId: t.userId,
	}

	err := h.s.DeleteLibrary(&library)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to delete library",
		})
		return
	}

	c.Status(http.StatusOK)
}

func (h *HTTPHandler) UpdateLibrary(c *gin.Context) {
	libraryId := c.Param("libraryId")

	var request UpdateLibraryRequest
	err := c.BindJSON(&request)
	if err != nil {
		log.Error().Msgf("Invalid request: %s", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request.",
		})
		return
	}

	t := h.getTokenInfo(c)

	library := domain.Library{
		Id:          libraryId,
		Name:        strings.TrimSpace(request.Name),
		Description: strings.TrimSpace(request.Description),
		OwnerId:     t.userId,
	}

	err = h.validateLibraryPayload(&library)

	if err != nil {
		log.Error().Msg(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	err = h.s.UpdateLibrary(&library)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to update library",
		})
		return
	}

	c.Status(http.StatusOK)
}

func (h *HTTPHandler) ListLibraries(c *gin.Context) {
	t := h.getTokenInfo(c)
	libraries, err := h.s.ListLibraries(t.userId)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to query libraries",
		})
		return
	}

	response := GetLibrariesResponse{}
	for _, l := range libraries {
		response.Libraries = append(response.Libraries, GetLibraryResponse{
			Id:          l.Id,
			Name:        l.Name,
			Description: l.Description,
			TotalItems:  l.TotalItems,
			UpdatedAt:   l.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, response)
}

/*
payload:

	{
		name: <libray name>,
	}
*/
func (h *HTTPHandler) CreateLibrary(c *gin.Context) {
	var request CreateLibraryRequest
	err := c.BindJSON(&request)
	if err != nil {
		log.Error().Msgf("Invalid request: %s", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request.",
		})
		return
	}

	t := h.getTokenInfo(c)

	library := domain.Library{
		Name:        strings.TrimSpace(request.Name),
		Description: strings.TrimSpace(request.Description),
		OwnerName:   t.displayName,
		OwnerId:     t.userId,
	}

	err = h.validateLibraryPayload(&library)

	if err != nil {
		log.Error().Msg(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	result, err := h.s.CreateLibrary(&library)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to create library",
		})
		return
	}

	c.JSON(http.StatusCreated, CreateLibraryResponse{
		Id:         result.Id,
		TotalItems: 0,
		UpdatedAt:  result.UpdatedAt,
	})
}
