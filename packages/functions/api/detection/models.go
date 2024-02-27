package detection

import (
	"fmt"
)

type Type int

const (
	Book Type = iota
)

func (e Type) String() string {
	switch e {
	case Book:
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
}
