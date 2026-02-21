package handlers

import (
	"encoding/base64"
	"net/http"

	"alexandria.isnan.eu/functions/internal/domain"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

func (h *HTTPHandler) Search(c *gin.Context) {
	var request SearchRequest
	err := c.BindJSON(&request)
	if err != nil {
		log.Error().Msgf("Invalid request: %s", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request.",
		})
		return
	}

	t := h.getTokenInfo(c)

	items, err := h.s.SearchItems(t.userId, request.Terms)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to search items",
		})
		return
	}

	itemsResponse := []GetItemResponse{}

	for _, i := range items {
		var encodedPicture *string
		if i.Picture != nil {
			encoded := base64.StdEncoding.EncodeToString(i.Picture)
			encodedPicture = &encoded
		}

		baseResponse := GetItemResponseBase{
			Id:         i.Id,
			Type:       i.Type,
			Title:      i.Title,
			Picture:    encodedPicture,
			LibraryId:  &i.LibraryId,
			LibrayName: &i.LibraryName,
			LentTo:     i.LentTo,
			OwnerId:    i.OwnerId,
			PictureUrl: i.PictureUrl,
			Collection: i.Collection,
			Order:      i.Order,
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

	response := SearchResponse{
		Items: itemsResponse,
	}

	c.JSON(http.StatusOK, response)
}
