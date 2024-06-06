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
					PictureUrl: i.PictureUrl,
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

	response := SearchResponse{
		Items: itemsResponse,
	}

	c.JSON(http.StatusOK, response)
}
