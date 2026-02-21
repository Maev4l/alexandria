// Edited by Claude.
package ports

// OCR provides text extraction from images
type OCR interface {
	// ExtractText extracts text from a base64-encoded image
	// Returns the most prominent text found (e.g., movie title from cover)
	ExtractText(imageBase64 string) (string, error)
}
