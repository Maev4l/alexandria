import { api } from './client.js';

export const librariesApi = {
  list: () => api.get('/libraries'),
  create: (body) => api.post('/libraries', body),
  update: (libraryId, body) => api.put(`/libraries/${libraryId}`, body),
  remove: (libraryId) => api.delete(`/libraries/${libraryId}`),
  share: (libraryId, email) => api.post(`/libraries/${libraryId}/share`, { email }),
  // The API accepts 1-10 emails per request.
  unshare: (libraryId, emails) => api.post(`/libraries/${libraryId}/unshare`, { emails }),
};
