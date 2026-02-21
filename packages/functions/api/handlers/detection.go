// Edited by Claude.
package handlers

import (
	"fmt"
	"net/http"
	"slices"
	"strings"

	"alexandria.isnan.eu/functions/internal/domain"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	"github.com/skowalak/isbn"
)

/*
payload:

	For books:
	{
		type: 0,
		code: <isbn>
	}

	For videos:
	{
		type: 1,
		image: <base64 encoded image>, // optional: for OCR detection
		title: <string>                // optional: for manual title search
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

	validTypes := []domain.ItemType{domain.ItemBook, domain.ItemVideo}

	if !slices.Contains(validTypes, domain.ItemType(request.Type)) {
		msg := fmt.Sprintf("Invalid request - Incorrect detection type : %d", request.Type)
		log.Error().Msg(msg)
		c.JSON(http.StatusBadRequest, gin.H{
			"message": msg,
		})
		return
	}

	// Handle book detection (ISBN-based)
	if domain.ItemType(request.Type) == domain.ItemBook {
		h.handleBookDetection(c, request)
		return
	}

	// Handle video detection (image OCR or manual title)
	if domain.ItemType(request.Type) == domain.ItemVideo {
		h.handleVideoDetection(c, request)
		return
	}
}

// handleBookDetection handles book detection via ISBN
func (h *HTTPHandler) handleBookDetection(c *gin.Context, request DetectRequest) {
	codeLength := len(request.Code)
	if codeLength != 13 && codeLength != 10 {
		msg := fmt.Sprintf("Invalid request - Incorrect code : %s (Type: %d)", request.Code, request.Type)
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

	resolvedBooks := h.s.ResolveBook(request.Code)

	detectedBooks := make([]DetectedBookResponse, 0)
	for _, r := range resolvedBooks {
		detectedBooks = append(detectedBooks, DetectedBookResponse{
			Id:         r.Id,
			Authors:    r.Authors,
			Title:      r.Title,
			Summary:    r.Summary,
			PictureUrl: r.PictureUrl,
			Isbn:       request.Code,
			Source:     r.Source,
			Error:      r.Error,
		})
	}

	c.JSON(http.StatusOK, DetectResponse{
		DetectedBooks: detectedBooks,
	})
}

// handleVideoDetection handles video detection via OCR or manual title search
func (h *HTTPHandler) handleVideoDetection(c *gin.Context, request DetectRequest) {
	var searchTitle string
	var extractedTitle *string

	// Priority: manual title > OCR from image
	if request.Title != nil && strings.TrimSpace(*request.Title) != "" {
		searchTitle = strings.TrimSpace(*request.Title)
	} else if request.Image != nil && *request.Image != "" {
		// Extract title from image using OCR
		extracted, err := h.s.ExtractTextFromImage(*request.Image)
		if err != nil {
			log.Error().Msgf("Failed to extract text from image: %s", err.Error())
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Failed to extract text from image",
			})
			return
		}

		if extracted == "" {
			log.Info().Msg("No text could be extracted from the image")
			c.JSON(http.StatusOK, DetectResponse{
				DetectedVideos: []DetectedVideoResponse{},
			})
			return
		}

		searchTitle = extracted
		extractedTitle = &extracted
	} else {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Video detection requires either 'image' (base64) or 'title' field",
		})
		return
	}

	// Search for videos using the title
	resolvedVideos := h.s.ResolveVideo(searchTitle)

	detectedVideos := make([]DetectedVideoResponse, 0)
	for _, v := range resolvedVideos {
		detectedVideos = append(detectedVideos, DetectedVideoResponse{
			Id:          v.Id,
			Title:       v.Title,
			Summary:     v.Summary,
			PictureUrl:  v.PictureUrl,
			Directors:   v.Directors,
			Cast:        v.Cast,
			ReleaseYear: v.ReleaseYear,
			Duration:    v.Duration,
			TmdbId:      v.TmdbId,
			Source:      v.Source,
			Error:       v.Error,
		})
	}

	c.JSON(http.StatusOK, DetectResponse{
		DetectedVideos: detectedVideos,
		ExtractedTitle: extractedTitle,
	})
}
