package services

import (
	"slices"
	"strings"
	"time"

	"alexandria.isnan.eu/functions/api/ports"
	"alexandria.isnan.eu/functions/api/services/resolvers"
	"alexandria.isnan.eu/functions/internal/domain"
	"github.com/rs/zerolog/log"
)

var bookResolversRegistry []ports.BookResolver

func (s *services) ResolveBook(code string) []domain.ResolvedBook {
	log.Info().Str("isbn", code).Msg("ResolveBook: start")
	start := time.Now()

	result := []domain.ResolvedBook{}

	// Channel carries resolver name + results for timing
	type resolverResult struct {
		name  string
		books []domain.ResolvedBook
	}
	ch := make(chan resolverResult, len(bookResolversRegistry))

	for _, r := range bookResolversRegistry {
		go func(resolver ports.BookResolver) {
			resolverStart := time.Now()
			innerCh := make(chan []domain.ResolvedBook, 1)
			resolver.Resolve(code, innerCh)
			books := <-innerCh
			resolverName := resolver.Name()
			log.Info().Str("resolver", resolverName).Dur("elapsed", time.Since(resolverStart)).Int("results", len(books)).Msg("ResolveBook: resolver done")
			ch <- resolverResult{name: resolverName, books: books}
		}(r)
	}

	for i := 0; i < len(bookResolversRegistry); i++ {
		res := <-ch
		if res.books != nil {
			result = append(result, res.books...)
		}
	}

	slices.SortFunc(result, func(a, b domain.ResolvedBook) int {
		return strings.Compare(a.Source, b.Source)
	})

	log.Info().Dur("totalElapsed", time.Since(start)).Int("totalResults", len(result)).Msg("ResolveBook: done")
	return result
}

func init() {

	bookResolversRegistry = []ports.BookResolver{
		resolvers.NewBabelioResolver(),
		resolvers.NewGoogleResolver(),
		resolvers.NewGoodReadsResolver(),
	}

}
