package resolvers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"alexandria.isnan.eu/functions/api/ports"
	"alexandria.isnan.eu/functions/internal/domain"
	"github.com/corpix/uarand"
	"github.com/gocolly/colly"
	"github.com/gocolly/colly/extensions"
	"github.com/microcosm-cc/bluemonday"
	"github.com/rs/zerolog/log"
)

type goodreadsResolver struct {
	client *http.Client
	url    string
	policy *bluemonday.Policy
}

func (r *goodreadsResolver) Name() string {
	return "Goodreads"
}

func (r *goodreadsResolver) Resolve(code string, ch chan []domain.ResolvedBook) {

	searchRequest, _ := http.NewRequest(http.MethodGet, fmt.Sprintf("%s/search?q=%s&search_type=books", r.url, code), nil)
	searchRequest.Host = "www.goodreads.com"
	searchRequest.Header.Set("User-Agent", uarand.GetRandom())
	searchRequest.Header.Set("Origin", r.url)
	searchRequest.Header.Set("Host", r.url)
	searchRequest.Header.Set("Referer", fmt.Sprintf("%s/search", r.url))

	searchResponse, err := r.client.Do(searchRequest)
	if err != nil {
		log.Error().Str("source", "Goodreads").Msgf("Failed to search: %s", err.Error())
		msg := "Unavailable - Try later."
		ch <- []domain.ResolvedBook{{
			Source: r.Name(),
			Error:  &msg}}
		return
	}

	defer searchResponse.Body.Close()

	location, err := searchResponse.Location()
	if err != nil {
		log.Error().Str("source", "Goodreads").Msgf("No item found for code: %s", code)
		ch <- []domain.ResolvedBook{}
		return
	}

	cookies := searchResponse.Cookies()

	c := colly.NewCollector()
	c.SetCookies(r.url, cookies)
	c.OnRequest(func(request *colly.Request) {
		request.Headers.Set("User-Agent", uarand.GetRandom())
		request.Headers.Set("Origin", r.url)
		request.Headers.Set("Host", r.url)
		request.Headers.Set("Referer", fmt.Sprintf("%s/search", r.url))
		request.Headers.Set("Accept-Language", "en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7")
	})

	extensions.RandomUserAgent(c)

	resolvedBook := domain.ResolvedBook{
		Id:      fmt.Sprintf("%s#%s", r.Name(), code),
		Source:  r.Name(),
		Authors: []string{},
	}

	c.OnHTML("h1[data-testid='bookTitle']", func(e *colly.HTMLElement) {
		resolvedBook.Title = strings.TrimSpace(e.Text)
	})

	c.OnHTML("div[data-testid='description']", func(e *colly.HTMLElement) {

		description := strings.ReplaceAll(e.ChildText("span.Formatted"), "<br>", "\n")
		resolvedBook.Summary = strings.TrimSpace(description)
		log.Info().Msgf("Description: %s", resolvedBook.Summary)
	})

	c.OnHTML("img.ResponsiveImage", func(e *colly.HTMLElement) {
		pictureSource := e.Attr("src")
		resolvedBook.PictureUrl = &pictureSource
	})

	c.OnHTML("div.AuthorPreview span.ContributorLink__name", func(e *colly.HTMLElement) {
		resolvedBook.Authors = append(resolvedBook.Authors, strings.TrimSpace(e.Text))
	})

	foundUrl := location.String()
	err = c.Visit(foundUrl)
	if err != nil {
		log.Error().Str("source", "Goodreads").Msgf(" Failed to visit book url: %s: %s", foundUrl, err.Error())
		msg := "Not available"
		resolvedBook.Error = &msg
	}

	ch <- []domain.ResolvedBook{resolvedBook}
}

func NewGoodReadsResolver() ports.BookResolver {

	return &goodreadsResolver{
		client: &http.Client{
			Timeout: 3 * time.Second,
			CheckRedirect: func(req *http.Request, via []*http.Request) error { // Do not follow redirect
				return http.ErrUseLastResponse
			}},
		url:    "https://www.goodreads.com",
		policy: bluemonday.StripTagsPolicy(),
	}
}
