import { describe, expect, it } from 'vitest';
import { handleMockRequest } from '../../tools/mock-api.js';
import {
  IMAGE_OCR_MISREAD,
  IMAGE_OCR_NETWORK_ERROR,
  IMAGE_OCR_NO_RESULT,
  IMAGE_OCR_TRUE_MISS,
  ISBN_GOOGLE_BLANK_PICTURE,
  ISBN_MIXED_ARTWORK,
  ISBN_MULTI_VOLUME,
  ISBN_NETWORK_ERROR,
  ISBN_NO_RESULT,
  ISBN_RESOLVER_ERROR,
  ISBN_TRUE_MISS,
  TITLE_FIVE_CANDIDATES,
  TITLE_MIXED_ARTWORK,
  TITLE_NETWORK_ERROR,
  TITLE_NO_RESULT,
  TITLE_TRUE_MISS,
} from '../../tools/mock-detections.js';

// Exercises the route through handleMockRequest (as the real HTTP layer calls it), not by
// importing detectBook/detectVideo directly - the point of this suite is that `POST /detections`
// with these exact, documented bodies reaches these exact states, which is what a capture screen
// will actually send.
const detect = (body) => handleMockRequest('POST', '/api/v1/detections', body);

describe('handleMockRequest - POST /detections', () => {
  describe('books (type 0)', () => {
    it('serves several candidates, most with artwork and one without', () => {
      const res = detect({ type: 0, code: ISBN_MIXED_ARTWORK });
      expect(res.status).toBe(200);
      expect(res.body.detectedBooks).toHaveLength(3);
      const withCover = res.body.detectedBooks.filter((c) => c.pictureUrl);
      const withoutCover = res.body.detectedBooks.filter((c) => !c.pictureUrl);
      expect(withCover.length).toBeGreaterThan(withoutCover.length);
      expect(withoutCover).toHaveLength(1);
      // `pictureUrl` must be ABSENT on the no-artwork candidate (Goodreads' nil pointer,
      // `omitempty`), not present-as-`null` - a falsy check alone would also pass on a present
      // empty string, which is a different, third state (see file header, fix round 2).
      expect(withoutCover[0]).not.toHaveProperty('pictureUrl');
      // Every candidate matched, so none carries the failed-resolver shape - `error` must be
      // ABSENT (a nil `*string` with `omitempty`), not present-as-`null`.
      expect(res.body.detectedBooks.every((c) => c.error == null)).toBe(true);
      expect(res.body.detectedBooks.every((c) => !('error' in c))).toBe(true);
    });

    // Fix round 3: Google takes the address of its thumbnail field unconditionally
    // (google.go:99, no nil/empty check), so a Google match with no cover serializes as a
    // NON-NIL pointer to "" - present, not absent. This is a third artwork shape distinct from
    // both "has a cover" (a real URL) and "absent" (Goodreads/TMDB above, whose pointer stays
    // nil on a miss - goodreads.go:91-94, tmdb.go:267-270). Both halves matter: a check that only
    // confirms the key is falsy would also pass on the wrong (absent) shape, and a check that
    // only confirms it exists would also pass if it held a real URL - the case exists precisely
    // because presence and truthiness disagree here.
    it('models a Google candidate whose pictureUrl is present but empty, not absent', () => {
      const res = detect({ type: 0, code: ISBN_GOOGLE_BLANK_PICTURE });
      expect(res.status).toBe(200);
      expect(res.body.detectedBooks).toHaveLength(1);
      const candidate = res.body.detectedBooks[0];
      expect(candidate.source).toBe('Google');
      expect(candidate).toHaveProperty('pictureUrl');
      expect(candidate.pictureUrl).toBeFalsy();
      expect(candidate.pictureUrl).toBe('');
    });

    it('shows a failed resolver as a candidate, not a dropped one, beside two that succeeded', () => {
      const res = detect({ type: 0, code: ISBN_RESOLVER_ERROR });
      expect(res.status).toBe(200);
      expect(res.body.detectedBooks).toHaveLength(3);
      const failed = res.body.detectedBooks.filter((c) => c.error != null);
      const succeeded = res.body.detectedBooks.filter((c) => c.error == null);
      expect(failed).toHaveLength(1);
      expect(succeeded).toHaveLength(2);
      // Mirrors babelio.go's real network/timeout failure shape: no id, no title, `authors`
      // null (Go's zero-value nil slice, not an empty array) - a UI reading `.title` or
      // `.authors.length` on this candidate must not crash on either.
      expect(failed[0]).toMatchObject({
        id: '',
        title: '',
        authors: null,
        source: 'Babelio',
        error: 'Unavailable - Try later.',
      });
    });

    // Fix round 2 (Finding 2): a real miss is never an empty array. Google always contributes
    // exactly one errored candidate on zero results (google.go:81-88), even when the other two
    // resolvers silently contribute nothing - so the aggregate is length 1, not 0. This is the
    // shape Task 18's manual-entry predicate has to key off.
    it('produces a length-1 array of all-errored candidates on a true miss, not an empty array', () => {
      const res = detect({ type: 0, code: ISBN_TRUE_MISS });
      expect(res.status).toBe(200);
      expect(res.body.detectedBooks).toHaveLength(1);
      expect(res.body.detectedBooks.every((c) => c.error != null)).toBe(true);
      expect(res.body.detectedBooks[0]).toMatchObject({ source: 'Google', title: '' });
    });

    it('serves a genuinely empty response only for the rarer all-resolvers-unreachable case, distinct from a true miss', () => {
      const res = detect({ type: 0, code: ISBN_NO_RESULT });
      expect(res.status).toBe(200);
      // omitempty on the real backend drops an empty slice entirely - absence IS the signal,
      // not an empty array the client would have to know to treat the same way. This is NOT
      // what "no book matches this ISBN" looks like (see ISBN_TRUE_MISS above) - it is kept as
      // its own case only because the schema permits it and a client must survive it.
      expect(res.body.detectedBooks).toBeUndefined();
    });

    it('fails the request itself on a network/server error, distinct from both miss shapes above', () => {
      const res = detect({ type: 0, code: ISBN_NETWORK_ERROR });
      expect(res.status).toBe(500);
      expect(res.body.detectedBooks).toBeUndefined();
      expect(typeof res.body.message).toBe('string');
    });

    it('400s a book detection request with no code', () => {
      const res = detect({ type: 0 });
      expect(res.status).toBe(400);
    });

    it('falls back to a single clean candidate for any other code', () => {
      const res = detect({ type: 0, code: '1234567890123' });
      expect(res.status).toBe(200);
      expect(res.body.detectedBooks).toHaveLength(1);
      // `error` on a successful candidate must be ABSENT, not `null` - `toBeNull()` is exactly
      // the assertion that would pass on the wrong (round-1) shape, so it is not used here.
      expect(res.body.detectedBooks[0]).not.toHaveProperty('error');
    });

    // The longest list this screen can serve on the book side, and the reason it exists: nothing
    // in either suite had ever rendered more than three candidates, so "what do five primary
    // plates look like stacked" was a question nobody could answer by looking.
    it('serves five candidates — three Google volumes against one ISBN, plus Babelio and Goodreads', () => {
      const res = detect({ type: 0, code: ISBN_MULTI_VOLUME });
      expect(res.status).toBe(200);
      expect(res.body.detectedBooks).toHaveLength(5);
      // The shape that makes this realistic rather than invented: Babelio and Goodreads emit at
      // most one candidate each (verified — every `ch <-` in both resolvers is a zero- or
      // one-element slice), so a long book list can only come from Google, which appends every
      // item from `?q=isbn:` with no limit requested.
      const bySource = (name) => res.body.detectedBooks.filter((c) => c.source === name);
      expect(bySource('Google')).toHaveLength(3);
      expect(bySource('Babelio')).toHaveLength(1);
      expect(bySource('Goodreads')).toHaveLength(1);
      // Every candidate answers the SAME identifier — they are volume records for one edition,
      // not different books, which is what distinguishes this from the film side's title search.
      expect(res.body.detectedBooks.every((c) => c.isbn === ISBN_MULTI_VOLUME)).toBe(true);
      // One without artwork, so the empty frame is exercised inside a long list too.
      expect(res.body.detectedBooks.filter((c) => !c.pictureUrl)).toHaveLength(1);
    });
  });

  describe('videos (type 1) - typed title search', () => {
    it('serves several candidates, most with artwork and one without', () => {
      const res = detect({ type: 1, title: TITLE_MIXED_ARTWORK });
      expect(res.status).toBe(200);
      expect(res.body.detectedVideos).toHaveLength(3);
      const withoutCover = res.body.detectedVideos.filter((c) => !c.pictureUrl);
      expect(withoutCover).toHaveLength(1);
      // Same rule as the book-side test above: TMDB's no-artwork candidate must be ABSENT, not
      // present-as-`null` (file header, fix round 2).
      expect(withoutCover[0]).not.toHaveProperty('pictureUrl');
      expect(res.body.detectedVideos.every((c) => !('error' in c))).toBe(true);
      // No OCR ran on a typed search, so the field the OCR path populates must be absent
      // entirely - not null, per the presence-over-value rule this whole route is built to.
      expect(res.body.extractedTitle).toBeUndefined();
    });

    // Finding 1 + Finding 2 together: video has exactly one resolver (TMDB), and TMDB always
    // emits one errored candidate on zero matches (tmdb.go:150-158) - so this single case is
    // simultaneously "a video candidate can carry error" and "the true video miss shape".
    it('produces a length-1 array of one errored TMDB candidate on a true miss, not an empty array', () => {
      const res = detect({ type: 1, title: TITLE_TRUE_MISS });
      expect(res.status).toBe(200);
      expect(res.body.detectedVideos).toHaveLength(1);
      expect(res.body.detectedVideos[0]).toMatchObject({ source: 'TMDB', title: '' });
      expect(res.body.detectedVideos[0].error).toContain(TITLE_TRUE_MISS);
      expect(res.body.extractedTitle).toBeUndefined();
    });

    it('serves a genuinely empty response only for the TMDB-misconfigured case, distinct from a true miss', () => {
      const res = detect({ type: 1, title: TITLE_NO_RESULT });
      expect(res.status).toBe(200);
      expect(res.body.detectedVideos).toBeUndefined();
      expect(res.body.extractedTitle).toBeUndefined();
    });

    it('fails the request itself on a network/server error', () => {
      const res = detect({ type: 1, title: TITLE_NETWORK_ERROR });
      expect(res.status).toBe(500);
      expect(res.body.detectedVideos).toBeUndefined();
    });

    it('400s a video detection request with neither image nor title', () => {
      const res = detect({ type: 1 });
      expect(res.status).toBe(400);
    });
    // The resolver's own maximum, measured rather than assumed: `tmdb.go:161` slices the deduped
    // fr-FR + en-US results to five before fetching any details, so five is the most this screen
    // can ever show for a film. The cap is OURS — the search request asks for no limit and TMDB
    // returns a full page of 20 — which is why a fixture pins it rather than a note guessing.
    it('serves the resolver\'s maximum of five candidates, as five DIFFERENT films', () => {
      const res = detect({ type: 1, title: TITLE_FIVE_CANDIDATES });
      expect(res.status).toBe(200);
      expect(res.body.detectedVideos).toHaveLength(5);
      // Different films, not editions of one. `search/movie?query=` matches TITLES; editions of a
      // single work are the BOOK side's shape, because an ISBN identifies one edition and Google
      // may hold several volume records against it. The first draft of this fixture had five
      // editions of one film — invisible in the source, obvious the moment it was rendered as
      // five rows carrying an identical director, year, runtime and cast.
      const titles = new Set(res.body.detectedVideos.map((c) => c.title));
      const directors = new Set(res.body.detectedVideos.map((c) => c.directors[0]));
      const years = new Set(res.body.detectedVideos.map((c) => c.releaseYear));
      expect(titles.size).toBe(5);
      expect(directors.size).toBe(5);
      expect(years.size).toBe(5);
      // One without a poster, so the empty frame is exercised inside a long list too.
      expect(res.body.detectedVideos.filter((c) => !c.pictureUrl)).toHaveLength(1);
      expect(res.body.detectedVideos.every((c) => !('error' in c))).toBe(true);
    });
  });

  describe('videos (type 1) - OCR capture', () => {
    it('extracts a plausible-but-wrong title and returns a confident, wrong match for it', () => {
      const res = detect({ type: 1, image: IMAGE_OCR_MISREAD });
      expect(res.status).toBe(200);
      // The whole reason `extractedTitle` is editable: this is a real, well-formed title - just
      // not the one on the cover the reader is holding.
      expect(res.body.extractedTitle).toBe('Le Trou');
      expect(res.body.detectedVideos).toHaveLength(1);
      expect(res.body.detectedVideos[0].title).toBe('Le Trou');
      // `error` on a matched candidate must be ABSENT, not `null` (file header, fix round 2).
      expect(res.body.detectedVideos[0]).not.toHaveProperty('error');
    });

    // The OCR-path counterpart of TITLE_TRUE_MISS: OCR read something, but TMDB has no match
    // for it - one errored candidate, plus the (legible) text OCR actually produced.
    it('extracts legible text that matches nothing on TMDB, and surfaces the errored candidate', () => {
      const res = detect({ type: 1, image: IMAGE_OCR_TRUE_MISS });
      expect(res.status).toBe(200);
      expect(res.body.extractedTitle).toBe('Xyzzy Fnord 1987');
      expect(res.body.detectedVideos).toHaveLength(1);
      expect(res.body.detectedVideos[0].error).toContain('Xyzzy Fnord 1987');
    });

    // Fix round 2 drive-by correction: round 1 modelled "OCR found nothing legible" as
    // `extractedTitle: ''` (present, empty). The real backend (handlers/detection.go) returns
    // BEFORE ever assigning `extractedTitle` on this path, so the true shape is `{}` - byte
    // identical to a typed search's no-result case, just reached via a different input.
    it('serves a fully empty response when OCR reads nothing legible at all', () => {
      const res = detect({ type: 1, image: IMAGE_OCR_NO_RESULT });
      expect(res.status).toBe(200);
      expect(res.body.extractedTitle).toBeUndefined();
      expect(res.body.detectedVideos).toBeUndefined();
    });

    it('fails the request itself on a network/server error, reached via the image input', () => {
      const res = detect({ type: 1, image: IMAGE_OCR_NETWORK_ERROR });
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Failed to extract text from image');
    });

    // Fix round 2 drive-by correction: handlers/detection.go's real precedence is "manual title
    // > OCR from image" - round 1 had this backwards. A title is used whenever present and
    // non-empty, even if an image was also supplied; OCR only runs when there is no usable title.
    it('prefers a simultaneously-supplied title over the image, matching the real backend precedence', () => {
      const res = detect({ type: 1, image: IMAGE_OCR_MISREAD, title: TITLE_MIXED_ARTWORK });
      expect(res.body.extractedTitle).toBeUndefined();
      expect(res.body.detectedVideos).toHaveLength(3);
    });
  });

  it('400s an unsupported detection type', () => {
    const res = detect({ type: 2, code: '9780000000000' });
    expect(res.status).toBe(400);
  });

  it('is reachable through handleMockRequest at the versioned API path', () => {
    // Guards the wiring in tools/mock-api.js itself, not just the fixture module in isolation.
    const res = handleMockRequest('POST', '/api/v1/detections', {
      type: 0,
      code: ISBN_MIXED_ARTWORK,
    });
    expect(res.status).toBe(200);
    expect(res.body.detectedBooks.length).toBeGreaterThan(0);
  });
});
