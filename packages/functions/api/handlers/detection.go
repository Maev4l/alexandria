package handlers

import (
	"alexandria.isnan.eu/functions/api/detection"
)

func resolveBook(code string) DetectResponse {
	resolvedBooks := detection.ResolveBook(code)

	detectedBooks := make([]DetectedBookResponse, 0)
	for _, r := range resolvedBooks {
		detectedBooks = append(detectedBooks, DetectedBookResponse{
			Id:         r.Id,
			Authors:    r.Authors,
			Title:      r.Title,
			Summary:    r.Summary,
			PictureUrl: r.PictureUrl,
			Isbn:       code,
		})
	}

	return DetectResponse{
		DetectedBooks: detectedBooks,
	}
}
