// Edited by Claude.
// Library API endpoints
import { api } from './client';

export const librariesApi = {
  // Get all libraries (owned + shared)
  getAll: () => api.get('/libraries'),

  // Create a new library
  create: (data) => api.post('/libraries', data),

  // Update a library
  update: (libraryId, data) => api.put(`/libraries/${libraryId}`, data),

  // Delete a library
  delete: (libraryId) => api.delete(`/libraries/${libraryId}`),

  // Share a library with another user
  share: (libraryId, userName) => api.post(`/libraries/${libraryId}/share`, { userName }),

  // Unshare a library from one or more users
  unshare: (libraryId, userNames) => api.post(`/libraries/${libraryId}/unshare`, { userNames }),

  // Get items in a library with cursor-based pagination
  getItems: (libraryId, { limit = 20, nextToken } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (nextToken) params.append('nextToken', nextToken);
    return api.get(`/libraries/${libraryId}/items?${params}`);
  },

  // Create a book in a library
  createBook: (libraryId, data) => api.post(`/libraries/${libraryId}/books`, data),

  // Update a book in a library
  updateBook: (libraryId, bookId, data) => api.put(`/libraries/${libraryId}/books/${bookId}`, data),

  // Create a video in a library
  createVideo: (libraryId, data) => api.post(`/libraries/${libraryId}/videos`, data),

  // Update a video in a library
  updateVideo: (libraryId, videoId, data) => api.put(`/libraries/${libraryId}/videos/${videoId}`, data),

  // Delete an item from a library (works for both books and videos)
  deleteItem: (libraryId, itemId) => api.delete(`/libraries/${libraryId}/items/${itemId}`),

  // Create an item event (lend/return)
  // type: 'LENT' or 'RETURNED', event: person name
  createItemEvent: (libraryId, itemId, { type, event }) =>
    api.post(`/libraries/${libraryId}/items/${itemId}/events`, { type, event }),

  // Get item events (lending history) with pagination
  getItemEvents: (libraryId, itemId, { limit = 20, nextToken } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (nextToken) params.append('nextToken', nextToken);
    return api.get(`/libraries/${libraryId}/items/${itemId}/events?${params}`);
  },

  // Delete all item events (clear history)
  deleteItemEvents: (libraryId, itemId) =>
    api.delete(`/libraries/${libraryId}/items/${itemId}/events`),

  // Get all collections in a library
  getCollections: (libraryId) => api.get(`/libraries/${libraryId}/collections`),

  // Create a collection in a library
  createCollection: (libraryId, data) => api.post(`/libraries/${libraryId}/collections`, data),

  // Delete a collection (items are orphaned, not deleted)
  deleteCollection: (libraryId, collectionId) =>
    api.delete(`/libraries/${libraryId}/collections/${collectionId}`),
};
