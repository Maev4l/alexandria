package domain

import (
	"fmt"
	"time"
)

type ItemType int

const (
	ItemBook ItemType = iota
	ItemVideo
	ItemCollection
)

func (e ItemType) String() string {
	switch e {
	case ItemBook:
		return "Book"
	case ItemVideo:
		return "Video"
	case ItemCollection:
		return "Collection"
	default:
		return fmt.Sprintf("%d", int(e))
	}
}

type ItemEventType string

const (
	Lent     ItemEventType = "LENT"
	Returned ItemEventType = "RETURNED"
)

type ItemEvent struct {
	Date  *time.Time
	Type  ItemEventType
	Event string
}

type ItemHistory struct {
	Entries           []ItemEvent
	ContinuationToken string
}

type ResolvedBook struct {
	Id         string
	Authors    []string
	Title      string
	Summary    string
	PictureUrl *string
	Source     string
	Error      *string
}

// ResolvedVideo represents a video resolved from TMDB
type ResolvedVideo struct {
	Id          string
	Title       string
	Summary     string
	PictureUrl  *string
	Directors   []string
	Cast        []string
	ReleaseYear int
	Duration    int
	TmdbId      string
	Source      string
	Error       *string
}

type Library struct {
	Id          string
	Name        string
	Description string
	OwnerName   string
	OwnerId     string
	TotalItems  int
	UpdatedAt   *time.Time
	SharedTo    []string
	SharedFrom  *string
}

type ShareLibrary struct {
	SharedFromUserId   string
	SharedFromUserName string
	SharedToUserId     string
	SharedToUserName   string
	LibraryId          string
	SharedToUserIndex  int
	UpdatedAt          *time.Time
}

// UnshareLibrary supports removing multiple users at once
type UnshareLibrary struct {
	SharedFromUserId   string
	SharedFromUserName string
	SharedToUserNames  []string
	SharedToUserIds    []string
	LibraryId          string
	// NewSharedToList is the filtered list after removing users
	NewSharedToList []string
}

type LibraryContent struct {
	Items             []*LibraryItem
	ContinuationToken string
}

type LibraryItem struct {
	Id             string
	Title          string
	Picture        []byte
	LibraryId      string
	LibraryName    string
	OwnerName      string
	OwnerId        string
	UpdatedAt      *time.Time
	Summary        string
	Authors        []string
	Isbn           string
	Type           ItemType
	PictureUrl     *string
	LentTo         *string
	CollectionId   *string // FK to Collection entity
	CollectionName *string // Denormalized for display and GSI1SK sorting
	Order          *int
	// Video-specific fields
	Directors   []string
	Cast        []string
	ReleaseYear *int
	Duration    *int
	TmdbId      *string
	// Collection-specific fields (only set when Type == ItemCollection)
	Items     []*LibraryItem // Nested items within collection
	ItemCount int            // Total items in collection (denormalized from Collection entity)
	Partial   bool           // True if collection continues from previous page
}

// Collection represents a grouping of items within a library
type Collection struct {
	Id          string
	Name        string
	Description string
	ItemCount   int
	OwnerId     string
	LibraryId   string
	CreatedAt   *time.Time
	UpdatedAt   *time.Time
}

// GroupedLibraryContent represents library content with collections nested with their items
type GroupedLibraryContent struct {
	Items             []*LibraryItem
	ContinuationToken string
}
