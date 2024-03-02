package detection

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

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

func (r *googleResolver) Resolve(code string, ch chan []ResolvedBook) {
	searchRequest, _ := http.NewRequest(http.MethodGet, fmt.Sprintf("%s/?q=isbn:%s", r.url, code), nil)
	searchRequest.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1")

	searchResponse, err := r.client.Do(searchRequest)
	if err != nil {
		log.Error().Msgf("Google - Failed to search: %s", err.Error())
		ch <- nil
		return
	}

	defer searchResponse.Body.Close()

	searchResponseBody, err := io.ReadAll(searchResponse.Body)
	if err != nil {
		log.Error().Msgf("Google - Failed to read search response: %s", err.Error())
		ch <- nil
		return
	}

	var searchResult googleSearchResult
	err = json.Unmarshal(searchResponseBody, &searchResult)
	if err != nil {
		log.Error().Msgf("Google - Failed to unmarshal search response: %s", err.Error())
		ch <- nil
		return
	}

	if searchResult.Total == 0 {
		log.Info().Msgf("Google - No item found for code: %s", code)
		ch <- []ResolvedBook{}
		return
	}

	var result []ResolvedBook

	for _, b := range searchResult.Items {
		resolvedBook := ResolvedBook{
			Id:         fmt.Sprintf("%s#%s", r.Name(), b.Id),
			Source:     r.Name(),
			Title:      b.VolumeInfo.Title,
			Authors:    b.VolumeInfo.Authors,
			Summary:    b.VolumeInfo.Description,
			PictureUrl: &b.VolumeInfo.ImageLinks.Thumbnail,
		}

		result = append(result, resolvedBook)
	}

	ch <- result
}

func newGoogleResolver() BookResolver {
	return &googleResolver{
		client: &http.Client{Timeout: 3 * time.Second},
		url:    "https://www.googleapis.com/books/v1/volumes",
	}
}
