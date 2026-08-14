import { api } from './client.js';

export const collectionsApi = {
  // Returns a header only — name, description, itemCount — never its member items. Members
  // come from the library listing, which is why collections stay inline rather than becoming
  // a destination: a cold link to one could not load its contents.
  list: (libraryId) => api.get(`/libraries/${libraryId}/collections`),
  get: (libraryId, collectionId) => api.get(`/libraries/${libraryId}/collections/${collectionId}`),
  create: (libraryId, body) => api.post(`/libraries/${libraryId}/collections`, body),
  update: (libraryId, collectionId, body) =>
    api.put(`/libraries/${libraryId}/collections/${collectionId}`, body),
  // Deleting a collection ORPHANS its items; it does not delete them.
  remove: (libraryId, collectionId) =>
    api.delete(`/libraries/${libraryId}/collections/${collectionId}`),
};
