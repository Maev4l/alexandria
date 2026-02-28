package handlers

import (
	"time"

	"alexandria.isnan.eu/functions/internal/domain"
)

type DetectRequest struct {
	Type  int     `json:"type"`
	Code  string  `json:"code"`            // ISBN for books
	Image *string `json:"image,omitempty"` // Base64 image for video OCR
	Title *string `json:"title,omitempty"` // Manual title input for video search
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

// DetectedVideoResponse represents a detected video from TMDB
type DetectedVideoResponse struct {
	Id          string   `json:"id"`
	Title       string   `json:"title"`
	Summary     string   `json:"summary"`
	PictureUrl  *string  `json:"pictureUrl,omitempty"`
	Directors   []string `json:"directors"`
	Cast        []string `json:"cast"`
	ReleaseYear int      `json:"releaseYear"`
	Duration    int      `json:"duration"`
	TmdbId      string   `json:"tmdbId"`
	Source      string   `json:"source"`
	Error       *string  `json:"error,omitempty"`
}

type DetectResponse struct {
	DetectedBooks  []DetectedBookResponse  `json:"detectedBooks,omitempty"`
	DetectedVideos []DetectedVideoResponse `json:"detectedVideos,omitempty"`
	ExtractedTitle *string                 `json:"extractedTitle,omitempty"` // Title extracted via OCR
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
	Id             string          `json:"id"`
	Type           domain.ItemType `json:"type"`
	Title          string          `json:"title"`
	Picture        *string         `json:"picture,omitempty"`
	PictureUrl     *string         `json:"pictureUrl,omitempty"`
	LibraryId      *string         `json:"libraryId,omitempty"`
	LibraryName    *string         `json:"libraryName,omitempty"`
	OwnerId        string          `json:"ownerId"`
	LentTo         *string         `json:"lentTo,omitempty"`
	CollectionId   *string         `json:"collectionId,omitempty"`
	CollectionName *string         `json:"collectionName,omitempty"`
	Order          *int            `json:"order,omitempty"`
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
	Title        string   `json:"title"`
	Summary      string   `json:"summary"`
	Authors      []string `json:"authors"`
	Isbn         string   `json:"isbn"`
	PictureUrl   *string  `json:"pictureUrl,omitempty"`
	CollectionId *string  `json:"collectionId,omitempty"`
	Order        *int     `json:"order,omitempty"`
}

type CreateBookResponse struct {
	Id        string     `json:"id"`
	UpdatedAt *time.Time `json:"updatedAt"`
}

type UpdateBookRequest struct {
	Title         string   `json:"title"`
	Summary       string   `json:"summary"`
	Authors       []string `json:"authors"`
	Isbn          string   `json:"isbn"`
	PictureUrl    *string  `json:"pictureUrl,omitempty"`
	CollectionId  *string  `json:"collectionId,omitempty"`
	Order         *int     `json:"order,omitempty"`
	UpdatePicture *bool    `json:"updatePicture,omitempty"`
}

// Video request/response models
type CreateVideoRequest struct {
	Title        string   `json:"title"`
	Summary      string   `json:"summary"`
	Directors    []string `json:"directors"`
	Cast         []string `json:"cast"`
	ReleaseYear  *int     `json:"releaseYear,omitempty"`
	Duration     *int     `json:"duration,omitempty"`
	TmdbId       *string  `json:"tmdbId,omitempty"`
	PictureUrl   *string  `json:"pictureUrl,omitempty"`
	CollectionId *string  `json:"collectionId,omitempty"`
	Order        *int     `json:"order,omitempty"`
}

type CreateVideoResponse struct {
	Id        string     `json:"id"`
	UpdatedAt *time.Time `json:"updatedAt"`
}

type UpdateVideoRequest struct {
	Title         string   `json:"title"`
	Summary       string   `json:"summary"`
	Directors     []string `json:"directors"`
	Cast          []string `json:"cast"`
	ReleaseYear   *int     `json:"releaseYear,omitempty"`
	Duration      *int     `json:"duration,omitempty"`
	TmdbId        *string  `json:"tmdbId,omitempty"`
	PictureUrl    *string  `json:"pictureUrl,omitempty"`
	CollectionId  *string  `json:"collectionId,omitempty"`
	Order         *int     `json:"order,omitempty"`
	UpdatePicture *bool    `json:"updatePicture,omitempty"`
}

// GetVideoResponse for video items
type GetVideoResponse struct {
	GetItemResponseBase
	Directors   []string `json:"directors"`
	Cast        []string `json:"cast"`
	Summary     string   `json:"summary"`
	ReleaseYear *int     `json:"releaseYear,omitempty"`
	Duration    *int     `json:"duration,omitempty"`
	TmdbId      *string  `json:"tmdbId,omitempty"`
}

func (g GetVideoResponse) getType() string { return domain.ItemVideo.String() }

// GetCollectionItemResponse for collection items (type = 2)
// Collections are returned as items in the items list for unified sorting
type GetCollectionItemResponse struct {
	GetItemResponseBase
	Description string `json:"description,omitempty"`
}

func (g GetCollectionItemResponse) getType() string { return domain.ItemCollection.String() }

// GetCollectionWithItemsResponse represents a collection (type=2) with nested items in grouped responses
// Named differently from GetCollectionResponse in collections.go to avoid conflict
type GetCollectionWithItemsResponse struct {
	GetItemResponseBase
	Description string            `json:"description,omitempty"`
	Items       []GetItemResponse `json:"items,omitempty"`   // Nested items within collection
	ItemCount   int               `json:"itemCount"`         // Total items in collection (from DynamoDB)
	Partial     bool              `json:"partial,omitempty"` // True if continues from previous page
}

func (g GetCollectionWithItemsResponse) getType() string { return domain.ItemCollection.String() }

type ShareRequest struct {
	Email string `json:"email"`
}

type UnshareRequest struct {
	Emails []string `json:"emails"`
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
