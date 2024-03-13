package services

import (
	"io"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

func fetchPicture(url string) ([]byte, error) {
	httpClient := &http.Client{Timeout: 3 * time.Second}
	fetchPictureRequest, _ := http.NewRequest(http.MethodGet, url, nil)
	fetchPictureRequest.Header.Add("Accept-Encoding", "gzip,deflate")
	fetchPictureResponse, err := httpClient.Do(fetchPictureRequest)

	if err != nil {
		log.Error().Str("url", url).Msgf("Failed to fetch picture: %s", err.Error())
		return nil, err
	}
	defer fetchPictureResponse.Body.Close()

	data, err := io.ReadAll(fetchPictureResponse.Body)
	if err != nil {
		log.Error().Str("url", url).Msgf("Failed to read fetch response: %s", err.Error())

		return nil, err
	}
	return data, nil

}
