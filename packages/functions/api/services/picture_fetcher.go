package services

import (
	"io"
	"net/http"
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
	req.Header.Add("Accept-Encoding", "gzip,deflate")
	req.Header.Set("User-Agent", uarand.GetRandom())
	resp, err := httpClient.Do(req)

	if err != nil {
		log.Error().Str("url", targetURL).Msgf("Failed to fetch picture: %s", err.Error())
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Str("url", targetURL).Msgf("Failed to read fetch response: %s", err.Error())
		return nil, err
	}
	return data, nil
}
