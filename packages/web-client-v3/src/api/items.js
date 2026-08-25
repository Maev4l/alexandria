import { api } from './client.js';

// The API caps limit at 50. 30 keeps a page small enough to render inside one frame while
// still filling a tall phone screen in a single request.
export const PAGE_SIZE = 30;

export const itemsApi = {
  list: (libraryId, { limit = PAGE_SIZE, nextToken } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (nextToken) params.set('nextToken', nextToken);
    return api.get(`/libraries/${libraryId}/items?${params}`);
  },
  // Same shape as the listing, so a detail route is deep-linkable in one request.
  get: (libraryId, itemId) => api.get(`/libraries/${libraryId}/items/${itemId}`),
  remove: (libraryId, itemId) => api.delete(`/libraries/${libraryId}/items/${itemId}`),
  createBook: (libraryId, body) => api.post(`/libraries/${libraryId}/books`, body),
  updateBook: (libraryId, bookId, body) => api.put(`/libraries/${libraryId}/books/${bookId}`, body),
  createVideo: (libraryId, body) => api.post(`/libraries/${libraryId}/videos`, body),
  updateVideo: (libraryId, videoId, body) =>
    api.put(`/libraries/${libraryId}/videos/${videoId}`, body),
};
