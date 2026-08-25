import { api } from './client.js';

export const eventsApi = {
  list: (libraryId, itemId, { limit = 20, nextToken } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (nextToken) params.set('nextToken', nextToken);
    return api.get(`/libraries/${libraryId}/items/${itemId}/events?${params}`);
  },
  // type is 'LENT' or 'RETURNED'; event is the person's name, capped at 50 characters.
  create: (libraryId, itemId, { type, event }) =>
    api.post(`/libraries/${libraryId}/items/${itemId}/events`, { type, event }),
  clear: (libraryId, itemId) => api.delete(`/libraries/${libraryId}/items/${itemId}/events`),
};
