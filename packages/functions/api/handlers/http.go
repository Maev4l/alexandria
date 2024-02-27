package handlers

import (
	"fmt"
	"net/http"
	"slices"

	"alexandria.isnan.eu/functions/api/detection"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	"github.com/skowalak/isbn"
)

type HTTPHandler struct {
}

func NewHTTPHandler() *HTTPHandler {
	return &HTTPHandler{}
}

/*
payload:

	{
		type: <book, movie>,
		code: <isbn>
	}
*/
func (h *HTTPHandler) RequestDetection(c *gin.Context) {
	var request DetectRequest
	err := c.BindJSON(&request)
	if err != nil {
		log.Error().Msgf("Invalid request: %s", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request.",
		})
		return
	}

	validTypes := []detection.Type{detection.Book}

	if !slices.Contains(validTypes, request.Type) {
		msg := fmt.Sprintf("Invalid request - Incorrect detection type : %d", request.Type)
		log.Error().Msg(msg)
		c.JSON(http.StatusBadRequest, gin.H{
			"message": msg,
		})
		return
	}

	codeLength := len(request.Code)
	if request.Type == detection.Book && (codeLength != 13 && codeLength != 10) {
		msg := fmt.Sprintf("Invalid request - Incorrect code : %s (Type: %s)", request.Code, request.Type.String())
		log.Error().Msg(msg)
		c.JSON(http.StatusBadRequest, gin.H{
			"message": msg,
		})
		return
	}

	if codeLength == 13 {
		_, err := isbn.ISBN13(request.Code)
		if err != nil {
			msg := fmt.Sprintf("Invalid request - Incorrect isbn : %s - Expected ISBN13", request.Code)
			log.Error().Msg(msg)
			c.JSON(http.StatusBadRequest, gin.H{
				"message": msg,
			})
			return
		}
	}

	if codeLength == 10 {
		_, err := isbn.ISBN10(request.Code)
		if err != nil {
			msg := fmt.Sprintf("Invalid request - Incorrect isbn : %s - Expected ISBN10", request.Code)
			log.Error().Msg(msg)
			c.JSON(http.StatusBadRequest, gin.H{
				"message": msg,
			})
			return
		}
	}

	resolvedBooks := detection.ResolveBook(request.Code)

	detectedBooks := make([]DetectedBookResponse, 0)
	for _, r := range resolvedBooks {
		detectedBooks = append(detectedBooks, DetectedBookResponse{
			Id:         r.Id,
			Authors:    r.Authors,
			Title:      r.Title,
			Summary:    r.Summary,
			PictureUrl: r.PictureUrl,
		})
	}

	c.JSON(http.StatusOK, DetectResponse{
		DetectedBooks: detectedBooks,
	})
}
