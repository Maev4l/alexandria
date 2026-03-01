// Edited by Claude.
package resolvers

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
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
	"golang.org/x/text/encoding/charmap"

	"github.com/gocolly/colly"
	utls "github.com/refraction-networking/utls"
	"github.com/rs/zerolog/log"
)

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
var browserHeaders = map[string]string{
	"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
	"Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
	"Accept-Encoding": "gzip, deflate, br",
	"Connection":      "keep-alive",
	"Cache-Control":   "no-cache",
}

// randomDelay adds a random delay between min and max milliseconds
// to avoid detection by rate limiters
func randomDelay(minMs, maxMs int) {
	delay := time.Duration(minMs+rand.Intn(maxMs-minMs)) * time.Millisecond
	time.Sleep(delay)
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
	searchRequest.Header.Set("User-Agent", randomUserAgent())
	searchRequest.Header.Set("Origin", r.url)
	searchRequest.Header.Set("Referer", fmt.Sprintf("%s/recherche.php", r.url))
	searchRequest.Header.Set("Content-Type", "application/json")
	// Add browser headers to blend in
	for k, v := range browserHeaders {
		searchRequest.Header.Set(k, v)
	}

	searchResponse, err := r.client.Do(searchRequest)
	if err != nil {
		if isTimeout(err) {
			log.Warn().Str("source", "Babelio").Msg("Detection request timed out")
		} else {
			log.Error().Str("source", "Babelio").Msgf("Failed to detect: %s", err.Error())
		}
		msg := "Unavailable - Try later."
		ch <- []domain.ResolvedBook{{
			Source: r.Name(),
			Error:  &msg}}
		return
	}

	defer func() { _ = searchResponse.Body.Close() }()

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

	// Random delay between search and scrape to mimic human behavior (500-1500ms)
	randomDelay(500, 1500)

	// Use same browser-like transport for colly with timeout
	c := colly.NewCollector()
	c.SetRequestTimeout(5 * time.Second)
	c.WithTransport(createBrowserTransport())

	// Share cookies from search response to maintain session
	if cookies := searchResponse.Cookies(); len(cookies) > 0 {
		parsedUrl, _ := url.Parse(r.url)
		c.SetCookies(parsedUrl.String(), cookies)
	}

	// Add browser headers on each request
	c.OnRequest(func(req *colly.Request) {
		req.Headers.Set("User-Agent", randomUserAgent())
		req.Headers.Set("Referer", fmt.Sprintf("%s/recherche.php", r.url))
		for k, v := range browserHeaders {
			req.Headers.Set(k, v)
		}
	})

	resolvedBook := domain.ResolvedBook{
		Id:      fmt.Sprintf("%s#%s", r.Name(), foundBook.Id),
		Source:  r.Name(),
		Authors: []string{},
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
		// Small delay before fetching expanded summary
		randomDelay(200, 500)

		moreSummaryRequest, _ := http.NewRequest(http.MethodPost, fmt.Sprintf("%s/aj_voir_plus_a.php", r.url), strings.NewReader(data.Encode()))
		moreSummaryRequest.Host = "www.babelio.com"
		moreSummaryRequest.Header.Set("User-Agent", randomUserAgent())
		moreSummaryRequest.Header.Set("Origin", r.url)
		moreSummaryRequest.Header.Set("Referer", foundUrl)
		moreSummaryRequest.Header.Set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
		// Add browser headers
		for k, v := range browserHeaders {
			moreSummaryRequest.Header.Set(k, v)
		}

		moreSummaryResponse, err := r.client.Do(moreSummaryRequest)
		if err != nil {
			log.Error().Str("source", "Babelio").Msgf("Failed to request more summary for %s: %s", foundUrl, err.Error())
			ch <- nil
			return
		}
		defer func() { _ = moreSummaryResponse.Body.Close() }()
		body, _ := io.ReadAll(moreSummaryResponse.Body)
		dec8859_1 := charmap.ISO8859_1.NewDecoder()
		body, err = dec8859_1.Bytes(body)
		if err != nil {
			log.Error().Msg("Failed to encode in utf-8")
			ch <- nil
			return
		}
		summary := string(body)
		// Remove line breaks
		summary = strings.Trim(summary, "\n\t")

		// The replace <br> tag, with line breaks
		summary = strings.ReplaceAll(summary, "<br>", "\n")
		summary = html.UnescapeString(summary)
		summary = strings.TrimSpace(summary)
		resolvedBook.Summary = summary
	})

	c.OnHTML(".livre_resume", func(e *colly.HTMLElement) {
		if !needExpandSummary {
			dec8859_1 := charmap.ISO8859_1.NewDecoder()
			summary, err := dec8859_1.String(e.Text)
			if err != nil {
				log.Error().Msg("Failed to encode in utf-8")
				ch <- nil
				return
			}

			summary = strings.Trim(summary, "\n\t")
			// The replace <br> tag, with line breaks
			summary = strings.ReplaceAll(summary, "<br>", "\n")
			summary = html.UnescapeString(summary)
			summary = strings.TrimSpace(summary)
			resolvedBook.Summary = summary
		}
	})

	c.OnHTML("h1[itemprop='name']", func(e *colly.HTMLElement) {
		resolvedBook.Title = strings.TrimSpace(e.ChildText("a"))
	})

	err = c.Visit(foundUrl)
	if err != nil {
		if isTimeout(err) {
			log.Warn().Str("source", "Babelio").Str("url", foundUrl).Msg("Detection request timed out")
		} else {
			log.Error().Str("source", "Babelio").Msgf("Failed to detect: %s: %s", foundUrl, err.Error())
		}
		msg := "Not available"
		resolvedBook.Error = &msg
	}

	ch <- []domain.ResolvedBook{resolvedBook}
}

// createBrowserTransport creates an HTTP transport that mimics a real browser
// - Uses uTLS to spoof Chrome's TLS fingerprint (JA3)
// - Forces HTTP/1.1 to avoid HTTP/2 fingerprinting
func createBrowserTransport() *http.Transport {
	return &http.Transport{
		// Force HTTP/1.1 to avoid HTTP/2 fingerprinting
		ForceAttemptHTTP2: false,
		// Disable HTTP/2 entirely
		TLSNextProto: make(map[string]func(authority string, c *tls.Conn) http.RoundTripper),
		// Use uTLS to mimic Chrome's TLS fingerprint
		DialTLSContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			// Establish TCP connection
			dialer := &net.Dialer{Timeout: 10 * time.Second}
			conn, err := dialer.DialContext(ctx, network, addr)
			if err != nil {
				return nil, err
			}

			// Extract hostname for SNI
			host, _, err := net.SplitHostPort(addr)
			if err != nil {
				host = addr
			}

			// Create uTLS connection mimicking Chrome 120
			tlsConfig := &utls.Config{
				ServerName: host,
			}
			tlsConn := utls.UClient(conn, tlsConfig, utls.HelloChrome_120)

			// Perform TLS handshake
			if err := tlsConn.Handshake(); err != nil {
				conn.Close()
				return nil, err
			}

			return tlsConn, nil
		},
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
