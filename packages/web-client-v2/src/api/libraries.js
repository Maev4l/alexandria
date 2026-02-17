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

  // Delete an item from a library
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
};
