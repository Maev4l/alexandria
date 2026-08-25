import { describe, expect, it } from 'vitest';
import { handleMockRequest } from '../../tools/mock-api.js';
import {
  TERM_ERROR,
  TERM_LARGE,
  TERM_MIXED,
  TERM_NONE,
  TERM_SINGLE,
} from '../../tools/mock-search.js';

// Exercises the route through handleMockRequest (as the real HTTP layer calls it), not by
// importing handleSearch directly - the point of this suite is that `POST /search` with these
// exact, documented term arrays reaches these exact states, which is what the search screen will
// actually send. `terms` is joined with a single space to form the lookup key, matching however
// many words a debounced query happens to have been split into.
const search = (terms) => handleMockRequest('POST', '/api/v1/search', { terms });

describe('handleMockRequest - POST /search', () => {
  it('serves results across two owned libraries and one shared library, per SearchResponse', () => {
    const res = search([TERM_MIXED]);
    expect(res.status).toBe(200);
    // `results` is the response key (SearchResponse.results, openapi.yaml) - not `items`.
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThanOrEqual(6);

    const libraryIds = new Set(res.body.results.map((r) => r.libraryId));
    expect(libraryIds).toContain('lib-fiction');
    expect(libraryIds).toContain('lib-films');
    expect(libraryIds).toContain('lib-shared-in');
    // Two OWNED libraries plus one SHARED - not three owned, not one of each collapsed together.
    expect(libraryIds.size).toBe(3);

    // Every result names its library, because the row prints it and a fixture omitting it would
    // make that field untestable (the task brief's own requirement).
    expect(res.body.results.every((r) => r.libraryId && r.libraryName)).toBe(true);

    // Most carry artwork; exactly one does not - the empty-frame case sitting beside a normal one.
    const withoutArtwork = res.body.results.filter((r) => !r.picture);
    expect(withoutArtwork).toHaveLength(1);
    expect(res.body.results.length - withoutArtwork.length).toBeGreaterThan(withoutArtwork.length);

    // Exactly one lent item, so the stamp and the shared tag are exercised side by side.
    const lent = res.body.results.filter((r) => r.lentTo != null);
    expect(lent).toHaveLength(1);
    // `lentTo` must be ABSENT on every other result, not present-as-null (omitempty, per
    // handlers/models.go:92 and ui-v3.md's binding API constraint) - a falsy check alone would
    // also pass on an explicit `lentTo: null`, which is a different, wrong shape.
    const notLent = res.body.results.filter((r) => r.id !== lent[0].id);
    expect(notLent.every((r) => !('lentTo' in r))).toBe(true);

    // The item from the shared library is owned by someone else - that is what makes it shared.
    const sharedItem = res.body.results.find((r) => r.libraryId === 'lib-shared-in');
    expect(sharedItem.ownerId).not.toBe('OWNER1');
  });

  it('serves 400 results for the mount-cost measurement, mixing books and videos', () => {
    const res = search([TERM_LARGE]);
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(400);

    const ids = new Set(res.body.results.map((r) => r.id));
    expect(ids.size).toBe(400);

    const books = res.body.results.filter((r) => r.type === 0);
    const videos = res.body.results.filter((r) => r.type === 1);
    expect(books.length).toBeGreaterThan(0);
    expect(videos.length).toBeGreaterThan(0);
    expect(books.length + videos.length).toBe(400);

    // Every result names its library - same requirement as the mixed case above, at scale.
    expect(res.body.results.every((r) => r.libraryId && r.libraryName)).toBe(true);

    // ~90% carry artwork, since PRODUCT.md states a cover is the normal case, not the exception -
    // the fixture must not (re)invent the fixtures'-lie-in-the-other-direction mistake ui-v3.md
    // names explicitly. `picture` is omitted, not null, on the ones without.
    const withArtwork = res.body.results.filter((r) => 'picture' in r);
    expect(withArtwork).toHaveLength(360);
    const withoutArtwork = res.body.results.filter((r) => !('picture' in r));
    expect(withoutArtwork).toHaveLength(40);

    // No pagination on this endpoint (openapi.yaml's SearchResponse has no nextToken field).
    expect(res.body.nextToken).toBeUndefined();
  });

  it('serves a single result, for the row layout uncrowded', () => {
    const res = search([TERM_SINGLE]);
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].libraryId).toBeTruthy();
    expect(res.body.results[0].libraryName).toBeTruthy();
  });

  it('serves the zero state as an empty results array, not an absent key', () => {
    const res = search([TERM_NONE]);
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it('fails the request itself on the error state, inline and in place, never silently', () => {
    const res = search([TERM_ERROR]);
    expect(res.status).toBe(500);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.results).toBeUndefined();
  });

  it('falls back to a small representative result for any other term, for exploratory dev use', () => {
    const res = search(['some undocumented query']);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  it('is reachable through handleMockRequest at the versioned API path', () => {
    // Guards the wiring in tools/mock-api.js itself, not just the fixture module in isolation.
    const res = handleMockRequest('POST', '/api/v1/search', { terms: [TERM_MIXED] });
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
  });
});
