import { api } from './client.js';

// `POST /search` is the ONLY cross-library read this API offers (openapi.yaml: SearchRequest /
// SearchResponse). It takes `{ terms: string[] }` and returns `{ results }` — unpaginated, with
// no nextToken, no sort and no filter parameters, which is why the surface above it offers no
// sort or filter controls either.
//
// The query is split on whitespace and otherwise sent VERBATIM. The backend folds accents and
// case on BOTH sides — the text it indexes and the terms it receives — so `elephants` reaches
// `éléphants` however many accents are missing, and fuzziness is left to do what it is for,
// which is typos.
//
// Folding here anyway would still be wrong, and for the reason it always was: the client would
// have to reproduce the server's fold exactly, and any drift between the two silently stops
// matching. It is the same reason the browse stream reproduces the server's fold for bucket
// labels rather than calling localeCompare. Send the terms as typed; the server owns the fold.
export const searchApi = {
  query: (terms) => api.post('/search', { terms: terms.trim().split(/\s+/).filter(Boolean) }),
};
