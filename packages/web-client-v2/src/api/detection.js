// Edited by Claude.
// Detection API endpoints - ISBN lookup and video OCR/title search
import { api } from './client';

export const detectionApi = {
  // Detect book by ISBN code
  // type: 0 = Book
  detectBook: (isbn) => api.post('/detections', { type: 0, code: isbn }),

  // Detect video by cover image (OCR + TMDB search)
  // type: 1 = Video
  detectVideoByImage: (imageBase64) =>
    api.post('/detections', { type: 1, image: imageBase64 }),

  // Detect video by manual title search
  // type: 1 = Video
  detectVideoByTitle: (title) =>
    api.post('/detections', { type: 1, title }),
};
