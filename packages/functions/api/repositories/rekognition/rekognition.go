// Edited by Claude.
package rekognition

import (
	"context"
	"encoding/base64"
	"sort"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/rekognition"
	"github.com/aws/aws-sdk-go-v2/service/rekognition/types"
	"github.com/rs/zerolog/log"
)

type rekognitionOCR struct {
	client *rekognition.Client
}

// NewOCR creates a new Rekognition-based OCR implementation
func NewOCR(region string) *rekognitionOCR {
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	if err != nil {
		log.Error().Msgf("Failed to load AWS config for Rekognition: %s", err.Error())
		return nil
	}

	return &rekognitionOCR{
		client: rekognition.NewFromConfig(cfg),
	}
}

// ExtractText uses AWS Rekognition to extract text from a base64-encoded image
// Returns the most prominent text found (largest/most confident)
func (r *rekognitionOCR) ExtractText(imageBase64 string) (string, error) {
	// Decode base64 image
	imageBytes, err := base64.StdEncoding.DecodeString(imageBase64)
	if err != nil {
		log.Error().Msgf("Failed to decode base64 image: %s", err.Error())
		return "", err
	}

	// Call Rekognition DetectText
	input := &rekognition.DetectTextInput{
		Image: &types.Image{
			Bytes: imageBytes,
		},
	}

	result, err := r.client.DetectText(context.TODO(), input)
	if err != nil {
		log.Error().Msgf("Rekognition DetectText failed: %s", err.Error())
		return "", err
	}

	if len(result.TextDetections) == 0 {
		log.Info().Msg("No text detected in image")
		return "", nil
	}

	// Filter to LINE type detections (not individual WORDs)
	// and sort by confidence * height (larger text is more likely to be the title)
	var lines []struct {
		text   string
		score  float32
		height float32
	}

	for _, detection := range result.TextDetections {
		if detection.Type == types.TextTypesLine && detection.Confidence != nil && detection.Geometry != nil {
			text := aws.ToString(detection.DetectedText)
			// Skip very short text or text that looks like ratings/metadata
			if len(text) < 3 {
				continue
			}

			height := float32(0)
			if detection.Geometry.BoundingBox != nil && detection.Geometry.BoundingBox.Height != nil {
				height = *detection.Geometry.BoundingBox.Height
			}

			lines = append(lines, struct {
				text   string
				score  float32
				height float32
			}{
				text:   text,
				score:  *detection.Confidence,
				height: height,
			})
		}
	}

	if len(lines) == 0 {
		log.Info().Msg("No suitable text lines detected")
		return "", nil
	}

	// Sort by height (larger text first) then by confidence
	sort.Slice(lines, func(i, j int) bool {
		// Weight: 70% height, 30% confidence
		scoreI := lines[i].height*0.7 + (lines[i].score/100)*0.3
		scoreJ := lines[j].height*0.7 + (lines[j].score/100)*0.3
		return scoreI > scoreJ
	})

	// Return the best candidate (usually the movie title)
	extractedText := strings.TrimSpace(lines[0].text)
	log.Info().Msgf("Extracted text from image: %s", extractedText)

	return extractedText, nil
}
