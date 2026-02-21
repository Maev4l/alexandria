// Edited by Claude.
package services

import (
	"slices"
	"strings"

	"alexandria.isnan.eu/functions/api/ports"
	"alexandria.isnan.eu/functions/api/services/resolvers"
	"alexandria.isnan.eu/functions/internal/domain"
)

var videoResolversRegistry []ports.VideoResolver

// ResolveVideo searches for videos by title using registered resolvers
func (s *services) ResolveVideo(title string) []domain.ResolvedVideo {
	result := []domain.ResolvedVideo{}

	ch := make(chan []domain.ResolvedVideo, len(videoResolversRegistry))

	for _, r := range videoResolversRegistry {
		go r.ResolveByTitle(title, ch)
	}

	for i := 0; i < len(videoResolversRegistry); i++ {
		resolvedVideos := <-ch
		if resolvedVideos != nil {
			result = append(result, resolvedVideos...)
		}
	}

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
