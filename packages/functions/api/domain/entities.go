package domain

import (
	"fmt"
	"time"
)

type ItemType int

const (
	ItemBook ItemType = iota
)

func (e ItemType) String() string {
	switch e {
	case ItemBook:
		return "Book"
	default:
		return fmt.Sprintf("%d", int(e))
	}
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

type Library struct {
	Id          string
	Name        string
	Description string
	OwnerName   string
	OwnerId     string
	TotalItems  int
	UpdatedAt   *time.Time
}
type LibraryContent struct {
	Items             []*LibraryItem
	ContinuationToken string
}

type LibraryItem struct {
	Id          string
	Title       string
	Picture     []byte
	LibraryId   string
	LibraryName string
	OwnerName   string
	OwnerId     string
	UpdatedAt   *time.Time
	Summary     string
	Authors     []string
	Isbn        string
	Type        ItemType
	PictureUrl  *string
}
