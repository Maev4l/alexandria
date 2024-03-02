package handlers

import (
	"net/http"
	"strings"

	"alexandria.isnan.eu/functions/api/domain"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

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
			CreatedAt:   l.UpdatedAt,
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
	if len(library.Name) > 20 {
		msg := "Invalid request - Name too long (max. 20 chars)"
		log.Error().Msg(msg)
		c.JSON(http.StatusBadRequest, gin.H{
			"message": msg,
		})
		return
	}

	if len(library.Description) > 100 {
		msg := "Invalid request - Desccription too long (max. 100 chars)"
		log.Error().Msg(msg)
		c.JSON(http.StatusBadRequest, gin.H{
			"message": msg,
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
		CreatedAt:  result.UpdatedAt,
	})
}
