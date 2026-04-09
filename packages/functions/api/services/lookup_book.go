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

// Overall timeout for book resolution - return partial results if exceeded
const bookResolverTimeout = 25 * time.Second

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

	// Collect results with timeout - return partial results if some resolvers hang
	timeout := time.After(bookResolverTimeout)
	received := 0
	for received < len(bookResolversRegistry) {
		select {
		case res := <-ch:
			received++
			if res.books != nil {
				result = append(result, res.books...)
			}
		case <-timeout:
			log.Warn().Int("received", received).Int("expected", len(bookResolversRegistry)).Msg("ResolveBook: timeout, returning partial results")
			goto done
		}
	}
done:

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
