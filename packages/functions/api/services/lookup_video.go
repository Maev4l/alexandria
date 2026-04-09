// Edited by Claude.
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

// Overall timeout for video resolution - return partial results if exceeded
const videoResolverTimeout = 25 * time.Second

var videoResolversRegistry []ports.VideoResolver

// ResolveVideo searches for videos by title using registered resolvers
func (s *services) ResolveVideo(title string) []domain.ResolvedVideo {
	result := []domain.ResolvedVideo{}

	ch := make(chan []domain.ResolvedVideo, len(videoResolversRegistry))

	for _, r := range videoResolversRegistry {
		go r.ResolveByTitle(title, ch)
	}

	// Collect results with timeout - return partial results if some resolvers hang
	timeout := time.After(videoResolverTimeout)
	received := 0
	for received < len(videoResolversRegistry) {
		select {
		case resolvedVideos := <-ch:
			received++
			if resolvedVideos != nil {
				result = append(result, resolvedVideos...)
			}
		case <-timeout:
			log.Warn().Int("received", received).Int("expected", len(videoResolversRegistry)).Msg("ResolveVideo: timeout, returning partial results")
			goto done
		}
	}
done:

	// Sort by source name for consistent ordering
	slices.SortFunc(result, func(a, b domain.ResolvedVideo) int {
		return strings.Compare(a.Source, b.Source)
	})

	return result
}

func init() {
	videoResolversRegistry = []ports.VideoResolver{
		resolvers.NewTmdbResolver(),
	}
}
