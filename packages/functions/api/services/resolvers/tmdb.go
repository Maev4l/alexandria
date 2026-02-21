// Edited by Claude.
package resolvers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"

	"alexandria.isnan.eu/functions/api/ports"
	"alexandria.isnan.eu/functions/internal/domain"

	"github.com/rs/zerolog/log"
)

const (
	tmdbBaseURL     = "https://api.themoviedb.org/3"
	tmdbImageURL    = "https://image.tmdb.org/t/p/w500"
	tmdbCastLimit   = 5  // Limit cast to top 5 actors
	tmdbLangPrimary = "fr-FR" // Primary language for results
	tmdbLangFallback = "en-US" // Fallback language for search
)

type tmdbResolver struct {
	client      *http.Client
	accessToken string
}

// TMDB API response structures
type tmdbSearchResult struct {
	Page         int           `json:"page"`
	Results      []tmdbMovie   `json:"results"`
	TotalResults int           `json:"total_results"`
	TotalPages   int           `json:"total_pages"`
}

type tmdbMovie struct {
	Id           int     `json:"id"`
	Title        string  `json:"title"`
	Overview     string  `json:"overview"`
	PosterPath   *string `json:"poster_path"`
	ReleaseDate  string  `json:"release_date"`
	VoteAverage  float64 `json:"vote_average"`
}

type tmdbMovieDetails struct {
	Id          int     `json:"id"`
	Title       string  `json:"title"`
	Overview    string  `json:"overview"`
	PosterPath  *string `json:"poster_path"`
	ReleaseDate string  `json:"release_date"`
	Runtime     int     `json:"runtime"`
}

type tmdbCredits struct {
	Cast []tmdbCastMember `json:"cast"`
	Crew []tmdbCrewMember `json:"crew"`
}

type tmdbCastMember struct {
	Id        int    `json:"id"`
	Name      string `json:"name"`
	Character string `json:"character"`
	Order     int    `json:"order"`
}

type tmdbCrewMember struct {
	Id         int    `json:"id"`
	Name       string `json:"name"`
	Job        string `json:"job"`
	Department string `json:"department"`
}

func (r *tmdbResolver) Name() string {
	return "TMDB"
}

// ResolveByTitle searches for movies by title and returns resolved video metadata
// Searches in both French and English to maximize results
func (r *tmdbResolver) ResolveByTitle(title string, ch chan []domain.ResolvedVideo) {
	if r.accessToken == "" {
		log.Warn().Str("source", "TMDB").Msg("No access token configured")
		ch <- nil
		return
	}

	// Search in both languages and merge results (French first, then English)
	seenIds := make(map[int]bool)
	var allMovies []tmdbMovie

	for _, lang := range []string{tmdbLangPrimary, tmdbLangFallback} {
		movies := r.searchMovies(title, lang)
		for _, movie := range movies {
			if !seenIds[movie.Id] {
				seenIds[movie.Id] = true
				allMovies = append(allMovies, movie)
			}
		}
	}

	if len(allMovies) == 0 {
		log.Info().Str("source", "TMDB").Msgf("No movies found for title: %s", title)
		msg := fmt.Sprintf("No movies found for title: %s", title)
		ch <- []domain.ResolvedVideo{{
			Source: r.Name(),
			Error:  &msg,
		}}
		return
	}

	// Limit results to first 5 movies
	maxResults := 5
	if len(allMovies) < maxResults {
		maxResults = len(allMovies)
	}

	var results []domain.ResolvedVideo
	for _, movie := range allMovies[:maxResults] {
		resolved := r.fetchMovieDetails(movie.Id)
		if resolved != nil {
			results = append(results, *resolved)
		}
	}

	ch <- results
}

// searchMovies performs a search in the specified language
func (r *tmdbResolver) searchMovies(title, language string) []tmdbMovie {
	searchURL := fmt.Sprintf("%s/search/movie?query=%s&language=%s&page=1", tmdbBaseURL, url.QueryEscape(title), language)
	searchReq, _ := http.NewRequest(http.MethodGet, searchURL, nil)
	searchReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", r.accessToken))
	searchReq.Header.Set("Accept", "application/json")

	searchResp, err := r.client.Do(searchReq)
	if err != nil {
		log.Error().Str("source", "TMDB").Msgf("Failed to search (%s): %s", language, err.Error())
		return nil
	}
	defer func() { _ = searchResp.Body.Close() }()

	if searchResp.StatusCode != http.StatusOK {
		log.Error().Str("source", "TMDB").Msgf("Search returned status: %d (%s)", searchResp.StatusCode, language)
		return nil
	}

	searchBody, err := io.ReadAll(searchResp.Body)
	if err != nil {
		log.Error().Str("source", "TMDB").Msgf("Failed to read search response (%s): %s", language, err.Error())
		return nil
	}

	var searchResult tmdbSearchResult
	if err := json.Unmarshal(searchBody, &searchResult); err != nil {
		log.Error().Str("source", "TMDB").Msgf("Failed to unmarshal search response (%s): %s", language, err.Error())
		return nil
	}

	return searchResult.Results
}

// fetchMovieDetails fetches detailed movie info including credits
// Returns metadata in French (primary language)
func (r *tmdbResolver) fetchMovieDetails(movieId int) *domain.ResolvedVideo {
	// Fetch movie details and credits in French
	detailsURL := fmt.Sprintf("%s/movie/%d?append_to_response=credits&language=%s", tmdbBaseURL, movieId, tmdbLangPrimary)
	req, _ := http.NewRequest(http.MethodGet, detailsURL, nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", r.accessToken))
	req.Header.Set("Accept", "application/json")

	resp, err := r.client.Do(req)
	if err != nil {
		log.Warn().Str("source", "TMDB").Msgf("Failed to fetch movie details for %d: %s", movieId, err.Error())
		return nil
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		log.Warn().Str("source", "TMDB").Msgf("Movie details returned status %d for %d", resp.StatusCode, movieId)
		return nil
	}

	body, _ := io.ReadAll(resp.Body)

	// Combined response structure
	var details struct {
		tmdbMovieDetails
		Credits tmdbCredits `json:"credits"`
	}
	if err := json.Unmarshal(body, &details); err != nil {
		log.Warn().Str("source", "TMDB").Msgf("Failed to unmarshal movie details: %s", err.Error())
		return nil
	}

	// Extract all directors from crew
	var directors []string
	for _, crew := range details.Credits.Crew {
		if crew.Job == "Director" {
			directors = append(directors, crew.Name)
		}
	}

	// Extract top cast members (limited by tmdbCastLimit)
	var cast []string
	for i, actor := range details.Credits.Cast {
		if i >= tmdbCastLimit {
			break
		}
		cast = append(cast, actor.Name)
	}

	// Extract release year
	var releaseYear int
	if len(details.ReleaseDate) >= 4 {
		fmt.Sscanf(details.ReleaseDate[:4], "%d", &releaseYear)
	}

	// Build poster URL
	var pictureUrl *string
	if details.PosterPath != nil && *details.PosterPath != "" {
		posterURL := fmt.Sprintf("%s%s", tmdbImageURL, *details.PosterPath)
		pictureUrl = &posterURL
	}

	return &domain.ResolvedVideo{
		Id:          fmt.Sprintf("%s#%d", r.Name(), details.Id),
		Title:       details.Title,
		Summary:     details.Overview,
		PictureUrl:  pictureUrl,
		Directors:   directors,
		Cast:        cast,
		ReleaseYear: releaseYear,
		Duration:    details.Runtime,
		TmdbId:      fmt.Sprintf("%d", details.Id),
		Source:      r.Name(),
	}
}

// NewTmdbResolver creates a new TMDB resolver
// Access token is read from TMDB_ACCESS_TOKEN environment variable
func NewTmdbResolver() ports.VideoResolver {
	accessToken := os.Getenv("TMDB_ACCESS_TOKEN")
	if accessToken == "" {
		log.Warn().Msg("TMDB_ACCESS_TOKEN environment variable not set")
	}

	return &tmdbResolver{
		client:      &http.Client{Timeout: 5 * time.Second},
		accessToken: accessToken,
	}
}
