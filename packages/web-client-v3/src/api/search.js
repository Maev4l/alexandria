import { api } from './client.js';

// `POST /search` is the ONLY cross-library read this API offers (openapi.yaml: SearchRequest /
// SearchResponse). It takes `{ terms: string[] }` and returns `{ results }` — unpaginated, with
// no nextToken, no sort and no filter parameters, which is why the surface above it offers no
// sort or filter controls either.
//
// The query is split on whitespace and otherwise sent VERBATIM. The backend lowercases terms
// itself and does NOT fold accents; Bluge's default fuzziness of 1 is what lets `etranger` find
// `étranger` (and what stops `elephants` finding `éléphants`, two edits away). Folding here
// would query a differently-normalised string than the one the index was built from — the same
// reason the browse stream reproduces the server's fold rather than calling localeCompare.
export const searchApi = {
  query: (terms) => api.post('/search', { terms: terms.trim().split(/\s+/).filter(Boolean) }),
};
