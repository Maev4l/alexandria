package handlers

import (
	"time"

	"alexandria.isnan.eu/functions/internal/domain"
)

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
	Error      *string  `json:"error,omitempty"`
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
	UpdatedAt  *time.Time `json:"updatedAt"`
}

type GetLibraryResponse struct {
	Id          string     `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	TotalItems  int        `json:"totalItems"`
	UpdatedAt   *time.Time `json:"updatedAt"`
	SharedTo    []string   `json:"sharedTo"`
	SharedFrom  *string    `json:"sharedFrom,omitempty"`
}

type GetLibrariesResponse struct {
	Libraries []GetLibraryResponse `json:"libraries"`
}

type UpdateLibraryRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// Marker interface
type GetItemResponse interface {
	getType() string
}

type GetItemResponseBase struct {
	Id         string          `json:"id"`
	Type       domain.ItemType `json:"type"`
	Title      string          `json:"title"`
	Picture    *string         `json:"picture,omitempty"`
	LibraryId  *string         `json:"libraryId,omitempty"`
	LibrayName *string         `json:"libraryName,omitempty"`
	OwnerId    string          `json:"ownerId"`
	LentTo     *string         `json:"lentTo,omitempty"`
	Collection *string         `json:"collection,omitempty"`
	Order      *int            `json:"order,omitempty"`
}

func (g GetItemResponseBase) getType() string { return "" }

type GetBookResponse struct {
	GetItemResponseBase
	Authors []string `json:"authors"`
	Summary string   `json:"summary"`
	Isbn    string   `json:"isbn"`
}

func (g GetBookResponse) getType() string { return domain.ItemBook.String() }

type GetLibrariesContentResponse struct {
	GetItemsResponse  []GetItemResponse `json:"items"`
	ContinuationToken string            `json:"nextToken"`
}

type CreateBookRequest struct {
	Title      string   `json:"title"`
	Summary    string   `json:"summary"`
	Authors    []string `json:"authors"`
	Isbn       string   `json:"isbn"`
	PictureUrl *string  `json:"pictureUrl,omitempty"`
	Collection *string  `json:"collection,omitempty"`
	Order      *int     `json:"order,omitempty"`
}

type CreateBookResponse struct {
	Id        string     `json:"id"`
	UpdatedAt *time.Time `json:"updatedAt"`
}

type UpdateBookRequest struct {
	Title      string   `json:"title"`
	Summary    string   `json:"summary"`
	Authors    []string `json:"authors"`
	Isbn       string   `json:"isbn"`
	PictureUrl *string  `json:"pictureUrl,omitempty"`
	Collection *string  `json:"collection,omitempty"`
	Order      *int     `json:"order,omitempty"`
}

type ShareRequest struct {
	UserName string `json:"userName"`
}

type SearchRequest struct {
	Terms []string `json:"terms"`
}

type SearchResponse struct {
	Items []GetItemResponse `json:"results"`
}

type ItemHistoryEntryRequest struct {
	Type  domain.ItemEventType `json:"type"`
	Event string               `json:"event"`
}

type ItemHistoryEntry struct {
	Date  *time.Time           `json:"date"`
	Type  domain.ItemEventType `json:"type"`
	Event string               `json:"event"`
}

type ItemHistoryEntryListResponse struct {
	Entries           []ItemHistoryEntry `json:"events"`
	ContinuationToken string             `json:"nextToken"`
}
