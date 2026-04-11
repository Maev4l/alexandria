// Bedrock-based OCR using Claude vision for intelligent text extraction
package bedrock

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/rs/zerolog/log"
)

// Prompt for extracting movie title from DVD/Blu-ray covers
const extractionPrompt = `Extract the movie or TV show title from this image.

Context:
- This is a photo of a DVD/Blu-ray cover, possibly cropped or focused on the title area
- The title may be in French, English, or Spanish

Rules:
- Return ONLY the title, nothing else
- Ignore: BLU-RAY, DVD, 4K, ULTRA HD, EDITION, INTEGRALE, SAISON, ratings, studio logos, actor names, taglines
- If the title spans multiple lines, combine them into one line
- Keep the title in its original language (do not translate)
- If you cannot identify a title, return empty string

Title:`

type bedrockOCR struct {
	client  *bedrockruntime.Client
	modelID string
}

// NewOCR creates a new Bedrock-based OCR implementation
// modelID should be one of ModelHaiku or ModelSonnet
func NewOCR(region string, modelID string) *bedrockOCR {
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	if err != nil {
		log.Error().Msgf("Failed to load AWS config for Bedrock: %s", err.Error())
		return nil
	}

	if modelID == "" {
		log.Error().Msg("OCR_MODEL environment variable not set")
		return nil
	}

	log.Info().Msgf("Initializing Bedrock OCR with model: %s", modelID)

	return &bedrockOCR{
		client:  bedrockruntime.NewFromConfig(cfg),
		modelID: modelID,
	}
}

// Claude Messages API request/response structures
type claudeRequest struct {
	AnthropicVersion string          `json:"anthropic_version"`
	MaxTokens        int             `json:"max_tokens"`
	Messages         []claudeMessage `json:"messages"`
}

type claudeMessage struct {
	Role    string         `json:"role"`
	Content []contentBlock `json:"content"`
}

type contentBlock struct {
	Type   string       `json:"type"`
	Text   string       `json:"text,omitempty"`
	Source *imageSource `json:"source,omitempty"`
}

type imageSource struct {
	Type      string `json:"type"`
	MediaType string `json:"media_type"`
	Data      string `json:"data"`
}

type claudeResponse struct {
	Content    []responseContent `json:"content"`
	StopReason string            `json:"stop_reason"`
	Usage      usageInfo         `json:"usage"`
}

type responseContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type usageInfo struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

// ExtractText uses Claude vision to extract the movie title from a cover image
func (b *bedrockOCR) ExtractText(imageBase64 string) (string, error) {
	// Detect media type from base64 data
	mediaType := detectMediaType(imageBase64)

	// Build the request with image and prompt
	request := claudeRequest{
		AnthropicVersion: "bedrock-2023-05-31",
		MaxTokens:        100, // Title should be short
		Messages: []claudeMessage{
			{
				Role: "user",
				Content: []contentBlock{
					{
						Type: "image",
						Source: &imageSource{
							Type:      "base64",
							MediaType: mediaType,
							Data:      imageBase64,
						},
					},
					{
						Type: "text",
						Text: extractionPrompt,
					},
				},
			},
		},
	}

	requestBody, err := json.Marshal(request)
	if err != nil {
		log.Error().Msgf("Failed to marshal Bedrock request: %s", err.Error())
		return "", err
	}

	// Invoke the model
	output, err := b.client.InvokeModel(context.TODO(), &bedrockruntime.InvokeModelInput{
		ModelId:     aws.String(b.modelID),
		ContentType: aws.String("application/json"),
		Body:        requestBody,
	})
	if err != nil {
		log.Error().
			Str("model_id", b.modelID).
			Str("media_type", mediaType).
			Int("image_size_bytes", len(imageBase64)).
			Err(err).
			Msg("Bedrock InvokeModel failed")
		return "", err
	}

	// Parse response
	var response claudeResponse
	if err := json.Unmarshal(output.Body, &response); err != nil {
		log.Error().Msgf("Failed to unmarshal Bedrock response: %s", err.Error())
		return "", err
	}

	// Log usage for cost tracking
	log.Info().
		Int("input_tokens", response.Usage.InputTokens).
		Int("output_tokens", response.Usage.OutputTokens).
		Str("stop_reason", response.StopReason).
		Str("model", b.modelID).
		Msg("Bedrock OCR usage")

	// Extract text from response
	if len(response.Content) == 0 {
		log.Info().Msg("No content in Bedrock response")
		return "", nil
	}

	extractedText := strings.TrimSpace(response.Content[0].Text)

	// Log the extracted title
	log.Info().Msgf("Extracted title from image: %s", extractedText)

	return extractedText, nil
}

// detectMediaType attempts to detect the image media type from base64 data
func detectMediaType(imageBase64 string) string {
	// Try to decode enough bytes to detect type
	decoded, err := base64.StdEncoding.DecodeString(imageBase64[:min(100, len(imageBase64))])
	if err != nil {
		// Default to JPEG if detection fails
		return "image/jpeg"
	}

	contentType := http.DetectContentType(decoded)

	// Map to supported types
	switch {
	case strings.Contains(contentType, "jpeg"):
		return "image/jpeg"
	case strings.Contains(contentType, "png"):
		return "image/png"
	case strings.Contains(contentType, "gif"):
		return "image/gif"
	case strings.Contains(contentType, "webp"):
		return "image/webp"
	default:
		return "image/jpeg"
	}
}

