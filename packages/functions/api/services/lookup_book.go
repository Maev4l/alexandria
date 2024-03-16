package services

import (
	"slices"
	"strings"

	"alexandria.isnan.eu/functions/api/domain"
	"alexandria.isnan.eu/functions/api/ports"
	"alexandria.isnan.eu/functions/api/services/resolvers"
)

var bookResolversRegistry []ports.BookResolver

func (s *services) ResolveBook(code string) []domain.ResolvedBook {
	result := []domain.ResolvedBook{}

	ch := make(chan []domain.ResolvedBook, len(bookResolversRegistry))

	for _, r := range bookResolversRegistry {
		go r.Resolve(code, ch)
	}

	for i := 0; i < len(bookResolversRegistry); i++ {
		resolvedBooks := <-ch
		if resolvedBooks != nil {
			result = append(result, resolvedBooks...)
		}
	}

	slices.SortFunc(result, func(a, b domain.ResolvedBook) int {
		return strings.Compare(a.Source, b.Source)
	})

	return result
}

func init() {

	bookResolversRegistry = []ports.BookResolver{
		resolvers.NewBabelioResolver(),
		resolvers.NewGoogleResolver(),
	}

}
