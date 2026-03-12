// Edited by Claude.
package resolvers

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"html"
	"io"
	"math/rand"
	"net"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"

	"alexandria.isnan.eu/functions/api/ports"
	"alexandria.isnan.eu/functions/internal/domain"
	"golang.org/x/net/html/charset"

	"github.com/gocolly/colly"
	"github.com/microcosm-cc/bluemonday"
	"github.com/rs/zerolog/log"
)

// stripHTMLPolicy strips all HTML tags from text
var stripHTMLPolicy = bluemonday.StripTagsPolicy()

// Regex patterns for whitespace normalization
var (
	multipleSpacesRe  = regexp.MustCompile(`[^\S\n]+`)      // Multiple spaces/tabs (not newlines)
	multipleNewlinesRe = regexp.MustCompile(`\n{3,}`)       // 3+ newlines → 2 newlines (paragraph)
	leadingSpacesRe   = regexp.MustCompile(`(?m)^[ \t]+`)   // Leading spaces on each line
)

// cleanSummary sanitizes HTML content: converts <br> to newlines, strips remaining tags, unescapes entities, normalizes whitespace
func cleanSummary(text string) string {
	// Replace <br>, <br/>, <br /> with newlines before stripping tags
	text = strings.ReplaceAll(text, "<br>", "\n")
	text = strings.ReplaceAll(text, "<br/>", "\n")
	text = strings.ReplaceAll(text, "<br />", "\n")
	// Strip all remaining HTML tags
	text = stripHTMLPolicy.Sanitize(text)
	// Unescape HTML entities (&amp; -> &, etc.)
	text = html.UnescapeString(text)
	// Normalize whitespace: collapse multiple spaces, remove leading spaces per line
	text = multipleSpacesRe.ReplaceAllString(text, " ")
	text = leadingSpacesRe.ReplaceAllString(text, "")
	text = multipleNewlinesRe.ReplaceAllString(text, "\n\n")
	return strings.TrimSpace(text)
}

// isTimeout checks if an error is a timeout (context deadline, http timeout, or net timeout)
func isTimeout(err error) bool {
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	if os.IsTimeout(err) {
		return true
	}
	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return true
	}
	return false
}

// Modern user agents (updated 2024) - desktop browsers commonly used in France
var userAgents = []string{
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
}

// randomUserAgent returns a random user agent from the curated list
func randomUserAgent() string {
	return userAgents[rand.Intn(len(userAgents))]
}

type babelioResolver struct {
	client *http.Client
	url    string
}

// Common browser headers to mimic real browser behavior
// Note: Accept-Encoding is omitted so Go's HTTP client can auto-decompress
var browserHeaders = map[string]string{
	"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
	"Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
	"Connection":      "keep-alive",
	"Cache-Control":   "no-cache",
}

// randomDelay adds a random delay between min and max milliseconds
// to avoid detection by rate limiters
func randomDelay(minMs, maxMs int) {
	delay := time.Duration(minMs+rand.Intn(maxMs-minMs)) * time.Millisecond
	time.Sleep(delay)
}

func (r *babelioResolver) Name() string {
	return "Babelio"
}

func (r *babelioResolver) Resolve(code string, ch chan []domain.ResolvedBook) {
	// Go directly to ISBN page instead of using search API
	isbnUrl := fmt.Sprintf("%s/isbn/%s", r.url, code)

	c := colly.NewCollector()
	c.SetRequestTimeout(5 * time.Second)
	c.DetectCharset = true
	c.WithTransport(createBrowserTransport())

	c.OnRequest(func(req *colly.Request) {
		req.Headers.Set("User-Agent", randomUserAgent())
		req.Headers.Set("Referer", r.url)
		for k, v := range browserHeaders {
			req.Headers.Set(k, v)
		}
	})

	resolvedBook := domain.ResolvedBook{
		Source:  r.Name(),
		Authors: []string{},
	}

	// Extract book ID from canonical URL (format: /livres/Author-Title/ID)
	c.OnHTML("link[rel='canonical']", func(e *colly.HTMLElement) {
		href := e.Attr("href")
		re := regexp.MustCompile(`/livres/[^/]+/(\d+)`)
		if matches := re.FindStringSubmatch(href); len(matches) > 1 {
			resolvedBook.Id = fmt.Sprintf("%s#%s", r.Name(), matches[1])
		}
	})

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

	// Author selector - only match schema.org/Person (book authors), not schema.org/Thing (reviewers)
	c.OnHTML("span[itemprop='author'][itemtype*='Person']", func(e *colly.HTMLElement) {
		authorName := strings.TrimSpace(e.ChildText("span[itemprop='name']"))
		if authorName != "" {
			resolvedBook.Authors = append(resolvedBook.Authors, authorName)
		}
	})

	needExpandSummary := false
	c.OnHTML("a[onclick*='voir_plus_a']", func(e *colly.HTMLElement) {
		needExpandSummary = true

		jsScript := e.Attr("onclick")
		// Updated regex: now handles CSS selector format voir_plus_a('#d_bio', type, id)
		re := regexp.MustCompile(`voir_plus_a\('[^']*',\s*(\d+),\s*(\d+)\)`)
		matches := re.FindStringSubmatch(jsScript)
		if len(matches) < 3 {
			log.Warn().Str("source", "Babelio").Msgf("Could not parse voir_plus_a: %s", jsScript)
			return
		}

		data := url.Values{}
		data.Set("type", matches[1])
		data.Set("id_obj", matches[2])

		randomDelay(200, 500)

		moreSummaryRequest, _ := http.NewRequest(http.MethodPost, fmt.Sprintf("%s/aj_voir_plus_a.php", r.url), strings.NewReader(data.Encode()))
		moreSummaryRequest.Host = "www.babelio.com"
		moreSummaryRequest.Header.Set("User-Agent", randomUserAgent())
		moreSummaryRequest.Header.Set("Origin", r.url)
		moreSummaryRequest.Header.Set("Referer", isbnUrl)
		moreSummaryRequest.Header.Set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
		for k, v := range browserHeaders {
			moreSummaryRequest.Header.Set(k, v)
		}

		moreSummaryResponse, err := r.client.Do(moreSummaryRequest)
		if err != nil {
			log.Error().Str("source", "Babelio").Msgf("Failed to request expanded summary: %s", err.Error())
			return
		}
		defer func() { _ = moreSummaryResponse.Body.Close() }()

		reader, err := charset.NewReader(moreSummaryResponse.Body, moreSummaryResponse.Header.Get("Content-Type"))
		if err != nil {
			log.Error().Str("source", "Babelio").Msgf("Failed to create charset reader: %s", err.Error())
			return
		}
		body, err := io.ReadAll(reader)
		if err != nil {
			log.Error().Str("source", "Babelio").Msgf("Failed to read response body: %s", err.Error())
			return
		}
		resolvedBook.Summary = cleanSummary(string(body))
	})

	// Summary with itemprop="description" - more reliable selector for new UI
	c.OnHTML("div[itemprop='description'].livre_resume", func(e *colly.HTMLElement) {
		if !needExpandSummary {
			resolvedBook.Summary = cleanSummary(e.Text)
		}
	})

	// Fallback: original .livre_resume selector
	c.OnHTML(".livre_resume", func(e *colly.HTMLElement) {
		if !needExpandSummary && resolvedBook.Summary == "" {
			resolvedBook.Summary = cleanSummary(e.Text)
		}
	})

	c.OnHTML("h1[itemprop='name']", func(e *colly.HTMLElement) {
		resolvedBook.Title = strings.TrimSpace(e.ChildText("a"))
	})

	err := c.Visit(isbnUrl)
	if err != nil {
		if isTimeout(err) {
			log.Warn().Str("source", "Babelio").Str("isbn", code).Msg("Request timed out")
		} else {
			log.Error().Str("source", "Babelio").Msgf("Failed to fetch ISBN %s: %s", code, err.Error())
		}
		msg := "Unavailable - Try later."
		ch <- []domain.ResolvedBook{{Source: r.Name(), Error: &msg}}
		return
	}

	// Check if we found a book (title is required)
	if resolvedBook.Title == "" {
		log.Info().Str("source", "Babelio").Msgf("No book found for ISBN: %s", code)
		ch <- []domain.ResolvedBook{}
		return
	}

	ch <- []domain.ResolvedBook{resolvedBook}
}

// createBrowserTransport creates an HTTP transport with standard TLS
func createBrowserTransport() *http.Transport {
	return &http.Transport{
		TLSClientConfig: &tls.Config{
			MinVersion: tls.VersionTLS12,
		},
		// Allow HTTP/2 - Babelio now requires it
		ForceAttemptHTTP2: true,
	}
}

func NewBabelioResolver() ports.BookResolver {
	return &babelioResolver{
		client: &http.Client{
			Timeout:   5 * time.Second,
			Transport: createBrowserTransport(),
		},
		url: "https://www.babelio.com",
	}
}
