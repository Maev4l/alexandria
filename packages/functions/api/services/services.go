package services

import "alexandria.isnan.eu/functions/api/ports"

type services struct {
	db      ports.Database
	storage ports.Storage
	idp     ports.Idp
	ocr     ports.OCR
}

func NewServices(db ports.Database, s ports.Storage, i ports.Idp, o ports.OCR) *services {
	return &services{db: db, storage: s, idp: i, ocr: o}
}

// ExtractTextFromImage delegates to the OCR port
func (s *services) ExtractTextFromImage(imageBase64 string) (string, error) {
	return s.ocr.ExtractText(imageBase64)
}
