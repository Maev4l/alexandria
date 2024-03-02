package domain

import (
	"fmt"
	"time"
)

type DetectType int

const (
	DetectBook DetectType = iota
)

func (e DetectType) String() string {
	switch e {
	case DetectBook:
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
}

type Author string

type Book struct {
	Title     string
	Summary   string
	Isbn      string
	Authors   []Author
	Thumbnail string
}

type Library struct {
	Id          string
	Name        string
	Description string
	OwnerName   string
	OwnerId     string
	Books       []Book
	TotalItems  int
	UpdatedAt   *time.Time
}
