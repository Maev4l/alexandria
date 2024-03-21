package resolvers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"alexandria.isnan.eu/functions/api/domain"
	"alexandria.isnan.eu/functions/api/ports"

	"github.com/gocolly/colly"
	"github.com/rs/zerolog/log"
	"golang.org/x/text/encoding/charmap"
)

type babelioResolver struct {
	client *http.Client
	url    string
}

type babelioSearchResult struct {
	Url string `json:"url"`
	Id  string `json:"id_oeuvre"`
}

func (r *babelioResolver) Name() string {
	return "Babelio"
}

func (r *babelioResolver) Resolve(code string, ch chan []domain.ResolvedBook) {

	searchRequestPayload := struct {
		IsMobile bool   `json:"isMobile"`
		Term     string `json:"term"`
	}{
		IsMobile: true,
		Term:     code,
	}

	jsonSearchPayload, _ := json.Marshal(searchRequestPayload)
	searchRequest, _ := http.NewRequest(http.MethodPost, fmt.Sprintf("%s/aj_recherche.php", r.url), bytes.NewBuffer(jsonSearchPayload))
	searchRequest.Host = "www.babelio.com"
	searchRequest.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1")
	searchRequest.Header.Set("Origin", r.url)
	searchRequest.Header.Set("Referer", fmt.Sprintf("%s/recherche.php", r.url))

	searchResponse, err := r.client.Do(searchRequest)
	if err != nil {
		log.Error().Str("source", "Babelio").Msgf("Failed to search: %s", err.Error())
		ch <- nil
		return
	}

	defer searchResponse.Body.Close()

	searchResponseBody, err := io.ReadAll(searchResponse.Body)
	if err != nil {
		log.Error().Str("source", "Babelio").Msgf("Failed to read search response: %s", err.Error())
		ch <- nil
		return
	}

	var searchResult []babelioSearchResult
	err = json.Unmarshal(searchResponseBody, &searchResult)
	if err != nil {
		log.Error().Str("source", "Babelio").Msgf("Failed to unmarshal search response: %s", err.Error())
		ch <- nil
		return
	}

	if len(searchResult) == 0 {
		log.Error().Str("source", "Babelio").Msgf("No item found for code: %s", code)
		ch <- []domain.ResolvedBook{}
		return
	}

	foundBook := searchResult[0]
	foundUrl := fmt.Sprintf("https://www.babelio.com%s", foundBook.Url)

	c := colly.NewCollector()

	resolvedBook := domain.ResolvedBook{
		Id:     fmt.Sprintf("%s#%s", r.Name(), foundBook.Id),
		Source: r.Name(),
	}

	c.OnHTML("img[itemprop='image']", func(e *colly.HTMLElement) {
		imgSource := e.Attr("src")
		var imageUrl string
		if strings.HasPrefix(imgSource, "https://") || strings.HasPrefix(imgSource, "http://") {
			imageUrl = imgSource
		} else {
			imageUrl = fmt.Sprintf("%s%s", r.url, e.Attr("src"))
		}

		resolvedBook.PictureUrl = &imageUrl
	})

	c.OnHTML(".livre_con span[itemprop='author']", func(e *colly.HTMLElement) {
		resolvedBook.Authors = append(resolvedBook.Authors, strings.TrimSpace(e.ChildText("span[itemprop='name']")))
	})

	needExpandSummary := false
	c.OnHTML("a[onclick*='javascript:voir_plus_a']", func(e *colly.HTMLElement) {
		needExpandSummary = true

		jsScript := e.Attr("onclick")
		re, _ := regexp.Compile(`voir_plus_a\('.*?',(\d+),(\d+)\);`)
		matches := re.FindStringSubmatch(jsScript)
		data := url.Values{}
		data.Set("type", matches[1])
		data.Set("id_obj", matches[2])
		moreSummaryRequest, _ := http.NewRequest(http.MethodPost, fmt.Sprintf("%s/aj_voir_plus_a.php", r.url), strings.NewReader(data.Encode()))
		moreSummaryRequest.Host = "www.babelio.com"
		moreSummaryRequest.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1")
		moreSummaryRequest.Header.Set("Origin", r.url)
		moreSummaryRequest.Header.Set("Referer", foundUrl)
		moreSummaryRequest.Header.Set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")

		moreSummaryResponse, err := r.client.Do(moreSummaryRequest)
		if err != nil {
			log.Error().Str("source", "Babelio").Msgf("Failed to request more summary for %s: %s", foundUrl, err.Error())
			ch <- nil
			return
		}
		defer moreSummaryResponse.Body.Close()
		body, _ := io.ReadAll(moreSummaryResponse.Body)

		decoder := charmap.ISO8859_1.NewDecoder()
		output, err := decoder.Bytes(body)
		if err != nil {
			log.Error().Str("source", "Babelio").Msgf("Failed to decode response for %s: %s", foundUrl, err.Error())
			msg := "Not available"
			resolvedBook.Error = &msg
			return
		}

		summary := string(output)
		// Remove line breaks
		summary = strings.Trim(summary, "\n\t")
		// The replace <br> tag, with line breaks
		summary = strings.ReplaceAll(summary, "\u003cbr\u003e", "\n")
		summary = strings.TrimSpace(summary)
		resolvedBook.Summary = summary
	})

	c.OnHTML(".livre_resume", func(e *colly.HTMLElement) {
		if !needExpandSummary {
			summary := strings.TrimSpace(e.Text)
			summary = strings.Trim(summary, "\n\t")
			summary = strings.TrimSpace(summary)

			resolvedBook.Summary = summary
		}
	})

	c.OnHTML("h1[itemprop='name']", func(e *colly.HTMLElement) {
		resolvedBook.Title = strings.TrimSpace(e.ChildText("a"))
	})

	err = c.Visit(foundUrl)
	if err != nil {
		log.Error().Str("source", "Babelio").Msgf(" Failed to visit book url: %s: %s", foundUrl, err.Error())
		msg := "Not available"
		resolvedBook.Error = &msg
	}

	ch <- []domain.ResolvedBook{resolvedBook}
}

func NewBabelioResolver() ports.BookResolver {
	return &babelioResolver{
		client: &http.Client{Timeout: 3 * time.Second},
		url:    "https://www.babelio.com",
	}
}
