package handlers

import (
	"alexandria.isnan.eu/functions/api/detection"
)

type DetectRequest struct {
	Type detection.Type `json:"type"`
	Code string         `json:"code"`
}

type DetectedBookResponse struct {
	Id         string   `json:"id"`
	Authors    []string `json:"authors"`
	Title      string   `json:"title"`
	Summary    string   `json:"summary"`
	PictureUrl *string  `json:"pictureUrl,omitempty"`
	Isbn       string   `json:"isbn"`
	Source     string   `json:"source"`
}

type DetectResponse struct {
	DetectedBooks []DetectedBookResponse `json:"detectedBooks"`
}
