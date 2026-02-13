package resolvers

import (
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"time"

	"alexandria.isnan.eu/functions/api/ports"
	"alexandria.isnan.eu/functions/internal/domain"

	"github.com/corpix/uarand"
	"github.com/rs/zerolog/log"
)

type googleResolver struct {
	client *http.Client
	url    string
}

type googleSearchImageLinks struct {
	Thumbnail      string `json:"thumbnail"`
	SmallThumbnail string `json:"smallThumbnail"`
}

type googleSearchVolumeInfo struct {
	Title       string                 `json:"title"`
	Authors     []string               `json:"authors"`
	Description string                 `json:"description"`
	ImageLinks  googleSearchImageLinks `json:"imageLinks"`
}

type googleSearchResultItem struct {
	Id         string                 `json:"id"`
	VolumeInfo googleSearchVolumeInfo `json:"volumeInfo"`
}

type googleSearchResult struct {
	Total int                      `json:"totalItems"`
	Items []googleSearchResultItem `json:"items"`
}

func (r *googleResolver) Name() string {
	return "Google"
}

func (r *googleResolver) Resolve(code string, ch chan []domain.ResolvedBook) {
	searchRequest, _ := http.NewRequest(http.MethodGet, fmt.Sprintf("%s/?q=isbn:%s", r.url, code), nil)
	searchRequest.Header.Set("User-Agent", uarand.GetRandom())

	searchResponse, err := r.client.Do(searchRequest)
	if err != nil {
		log.Error().Str("source", "Google").Msgf("Failed to search: %s", err.Error())
		ch <- nil
		return
	}

	defer func() { _ = searchResponse.Body.Close() }()

	searchResponseBody, err := io.ReadAll(searchResponse.Body)
	if err != nil {
		log.Error().Str("source", "Google").Msgf("Failed to read search response: %s", err.Error())
		ch <- nil
		return
	}

	var searchResult googleSearchResult
	err = json.Unmarshal(searchResponseBody, &searchResult)
	if err != nil {
		log.Error().Str("source", "Google").Msgf(" Failed to unmarshal search response: %s", err.Error())
		ch <- nil
		return
	}

	if searchResult.Total == 0 {
		log.Info().Str("source", "Google").Msgf("No item found for code: %s", code)
		msg := fmt.Sprintf("No item found for code: %s", code)
		ch <- []domain.ResolvedBook{{
			Source: r.Name(),
			Error:  &msg}}
		return
	}

	var result []domain.ResolvedBook

	for _, b := range searchResult.Items {
		resolvedBook := domain.ResolvedBook{
			Id:         fmt.Sprintf("%s#%s", r.Name(), b.Id),
			Source:     r.Name(),
			Title:      b.VolumeInfo.Title,
			Authors:    b.VolumeInfo.Authors,
			Summary:    html.UnescapeString(b.VolumeInfo.Description),
			PictureUrl: &b.VolumeInfo.ImageLinks.Thumbnail,
		}

		if b.VolumeInfo.Authors == nil {
			resolvedBook.Authors = []string{}
		}

		result = append(result, resolvedBook)
	}

	ch <- result
}

func NewGoogleResolver() ports.BookResolver {
	return &googleResolver{
		client: &http.Client{Timeout: 3 * time.Second},
		url:    "https://www.googleapis.com/books/v1/volumes",
	}
}
