package handlers

import "time"

type DetectRequest struct {
	Type int    `json:"type"`
	Code string `json:"code"`
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

type CreateLibraryRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type CreateLibraryResponse struct {
	Id         string     `json:"id"`
	TotalItems int        `json:"totalItems"`
	CreatedAt  *time.Time `json:"createdAt"`
}

type GetLibraryResponse struct {
	Id          string     `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	TotalItems  int        `json:"totalItems"`
	CreatedAt   *time.Time `json:"createdAt"`
}

type GetLibrariesResponse struct {
	Libraries []GetLibraryResponse `json:"libraries"`
}
