package handlers

import (
	"errors"
	"net/http"
	"net/mail"
	"strings"

	"alexandria.isnan.eu/functions/internal/domain"
	"github.com/gin-gonic/gin"

	"github.com/rs/zerolog/log"
)

func (h *HTTPHandler) validateLibraryPayload(library *domain.Library) error {

	if len(library.Name) == 0 {
		return errors.New("invalid request - library name is mandatory")
	}

	if len(library.Name) > 20 {
		return errors.New("invalid request - name too long (max. 20 chars)")
	}

	if len(library.Description) > 100 {
		return errors.New("invalid request - description too long (max. 100 chars)")
	}
	return nil
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

	list := []GetLibraryResponse{}

	for _, l := range libraries {
		list = append(list, GetLibraryResponse{
			Id:          l.Id,
			Name:        l.Name,
			Description: l.Description,
			TotalItems:  l.TotalItems,
			SharedTo:    l.SharedTo,
			SharedFrom:  l.SharedFrom,
			UpdatedAt:   l.UpdatedAt,
		})
	}

	response := GetLibrariesResponse{
		Libraries: list,
	}
	c.JSON(http.StatusOK, response)
}

/*
payload:

	{
		UserNames: [<user email>, ...],
	}
*/

func (h *HTTPHandler) UnshareLibrary(c *gin.Context) {

	libraryId := c.Param("libraryId")

	var request UnshareRequest
	err := c.BindJSON(&request)
	if err != nil {
		log.Error().Msgf("Invalid request: %s", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request.",
		})
		return
	}

	// Validate: at least one user, max 10
	if len(request.UserNames) == 0 || len(request.UserNames) > 10 {
		log.Error().Msgf("Invalid request: userNames must have 1-10 entries")
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request.",
		})
		return
	}

	t := h.getTokenInfo(c)

	// Validate each email and check for self-unshare
	for _, userName := range request.UserNames {
		_, err = mail.ParseAddress(userName)
		if err != nil {
			log.Error().Msgf("Invalid username (not an email format): %s", userName)
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Invalid request.",
			})
			return
		}

		if t.userName == userName {
			log.Error().Msgf("Cannot self unshare: %s", userName)
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Invalid request.",
			})
			return
		}
	}

	sh := domain.UnshareLibrary{
		SharedFromUserName: t.userName,
		SharedFromUserId:   t.userId,
		SharedToUserNames:  request.UserNames,
		LibraryId:          libraryId,
	}

	err = h.s.UnshareLibrary(&sh)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to unshare library",
		})
		return
	}

	c.Status(http.StatusOK)
}

/*
payload:

	{
		UserName: <user email>,
	}
*/

func (h *HTTPHandler) ShareLibrary(c *gin.Context) {

	libraryId := c.Param("libraryId")

	var request ShareRequest
	err := c.BindJSON(&request)
	if err != nil {
		log.Error().Msgf("Invalid request: %s", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request.",
		})
		return
	}

	_, err = mail.ParseAddress(request.UserName)
	if err != nil {
		log.Error().Msgf("Invalid username (not an email format): %s", request.UserName)
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request.",
		})
		return
	}

	t := h.getTokenInfo(c)

	if t.userName == request.UserName {
		log.Error().Msgf("Cannot self share: %s", request.UserName)
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request.",
		})
		return
	}

	sh := domain.ShareLibrary{
		SharedFromUserName: t.userName,
		SharedFromUserId:   t.userId,
		SharedToUserName:   request.UserName,
		LibraryId:          libraryId,
	}

	err = h.s.ShareLibrary(&sh)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to share library",
		})
		return
	}

	c.Status(http.StatusOK)
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
