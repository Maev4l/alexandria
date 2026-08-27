import { api } from './client.js';

const BOOK = 0;
const VIDEO = 1;

// `POST /detections` is a side-effect-free read (packages/functions/api/handlers/detection.go
// only resolves against external catalogues, it writes nothing) — which is exactly what lets
// BookDetectionResults/VideoDetectionResults re-run it from a bare query string on a cold load
// (see AddBook) instead of needing `location.state` to survive a refresh.
export const detectionApi = {
  book: (code) => api.post('/detections', { type: BOOK, code }),
  // Either a base64 image for OCR, or a title typed by hand.
  video: ({ image, title }) => api.post('/detections', { type: VIDEO, image, title }),
};
