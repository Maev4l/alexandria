package services

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"alexandria.isnan.eu/functions/api/services/proxy"
	"github.com/corpix/uarand"
	"github.com/rs/zerolog/log"
)

func fetchPicture(targetURL string) ([]byte, error) {
	actualURL := targetURL
	timeout := 3 * time.Second

	if cfg := proxy.Lookup(targetURL); cfg != nil {
		apiKey := proxy.GetAPIKey(cfg.APIKeyParam)
		if apiKey != "" {
			actualURL = cfg.BuildURL(apiKey, targetURL)
			if cfg.TimeoutSeconds > 0 {
				timeout = time.Duration(cfg.TimeoutSeconds) * time.Second
			}
			log.Debug().Str("pattern", cfg.Pattern).Msg("Picture fetch: routing through proxy")
		}
	}

	httpClient := &http.Client{Timeout: timeout}
	req, _ := http.NewRequest(http.MethodGet, actualURL, nil)
	// Don't set Accept-Encoding manually - Go's http.Client handles gzip/deflate
	// automatically and decompresses the response transparently
	req.Header.Set("User-Agent", uarand.GetRandom())
	resp, err := httpClient.Do(req)

	if err != nil {
		log.Error().Str("url", targetURL).Msgf("Failed to fetch picture: %s", err.Error())
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	// Check for successful HTTP status (2xx)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Warn().Str("url", targetURL).Int("status", resp.StatusCode).Msg("Picture fetch returned non-2xx status")
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	// Validate content type is an image (some servers don't set this correctly, so be lenient)
	contentType := resp.Header.Get("Content-Type")
	if contentType != "" && !strings.HasPrefix(contentType, "image/") && !strings.HasPrefix(contentType, "application/octet-stream") {
		log.Warn().Str("url", targetURL).Str("contentType", contentType).Msg("Picture fetch returned non-image content type")
		return nil, fmt.Errorf("unexpected content type: %s", contentType)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Str("url", targetURL).Msgf("Failed to read fetch response: %s", err.Error())
		return nil, err
	}
	return data, nil
}
