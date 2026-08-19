// Fixture responses for POST /search (openapi.yaml: SearchRequest / SearchResponse).
//
// This route decides which states of the search screen are even reachable to build and
// screenshot (Task 20a, same reason Task 18a came before Task 18): a mock returning one clean
// array of three results would leave the honest-limits zero state, the 400-result mount-cost
// case, and the "shared library beside a lent item" case completely unbuilt, because nobody can
// design or critique a state they cannot reach. So this file is deliberately keyed off a fixed,
// documented `terms` input per state, exactly as `mock-detections.js` keys off `code`/`title`.
//
// The request body is `{ terms: string[] }` (openapi.yaml: SearchRequest) - whatever the search
// field split its debounced query into. The lookup key is those terms rejoined with a single
// space, so a fixture caller can pass either `[TERM_X]` or `TERM_X.split(' ')` and reach the same
// state; the fixture does not attempt to reproduce Bluge's fuzzy matching, only to answer with
// the documented state for the documented input, same as the detection route does for an ISBN.
//
// Every result is the SAME shape `GET /libraries/{id}/items` returns (a GetBookResponse or
// GetVideoResponse) - that is what lets a result row reuse the stream's ItemRow component
// (ui-v3.md, Search screen spec) - so this file reuses the existing item fixtures' real objects
// and cover URLs (src/test/fixtures/items.js, tools/mock-covers.js) rather than inventing a
// second, parallel catalogue that could drift from the shapes those tests already assert.
// `libraryId`/`libraryName` are present on every entry - the row prints the library, and a
// fixture omitting it would make that field untestable (this task's own requirement) - which the
// reused fixture items already carry from their own `book()`/`film()` construction.

import { fictionItems, itemsByLibrary } from '../src/test/fixtures/items.js';

const cover = (n) => `/mock-thumbnails/cover-${n}.webp`;

// ---------------------------------------------------------------------------------------------
// Term constants - each a sentinel query string, not a literal substring of what it returns
// (same convention as ISBN_MIXED_ARTWORK etc. in mock-detections.js, which is not itself a valid
// ISBN check-digit-wise either: the constant is a lookup key, not a claim about matching logic).
// ---------------------------------------------------------------------------------------------

// The ordinary case: two owned libraries and one shared, most with artwork, one without, one
// lent - the only state that exercises the Overprint Stamp and the Shared Ribbon side by side.
export const TERM_MIXED = 'roman';

// The mount-cost measurement (Task 20b) has nothing to measure without a large result set. 400 is
// not a guess: a 3-char prefix over five fields (title, authors, directors, cast, collection) on
// a 1000-item half-French catalogue is the likely shape - see the task brief this route exists
// to satisfy - and the fixture must be able to produce the case the code has to survive.
export const TERM_LARGE = 'les';

// One result, for the row's own layout uncrowded - the search-side twin of
// ISBN_GOOGLE_BLANK_PICTURE's "exercise one thing at a time" reasoning in mock-detections.js.
export const TERM_SINGLE = 'nadja';

// The zero state - where the honest limits ("search matches title, authors, directors, cast and
// collection only - not summary, not ISBN") and the accent note print (ui-v3.md, Search screen).
export const TERM_NONE = 'flapdoodle';

// The request itself fails - a Lambda timeout, an unhandled panic, API Gateway's own 5xx. Named
// like TITLE_NETWORK_ERROR / ISBN_NETWORK_ERROR in mock-detections.js for the same reason: a
// client has to survive this regardless of how rare the real trigger is, and "no results" must
// not be the only error path anyone ever designs for.
export const TERM_ERROR = 'TRIGGER_SEARCH_ERROR';

// ---------------------------------------------------------------------------------------------
// TERM_MIXED - reused, not invented. Pulling the actual fixture objects (rather than copies)
// guarantees this state can never drift from the shapes items.js and its own tests already
// assert - the same reason the OLD hardcoded `/search` route in mock-api.js did this too, before
// this file existed to serve the other four states beside it.
// ---------------------------------------------------------------------------------------------

const fictionById = (id) => fictionItems.find((item) => item.id === id);
const filmsById = (id) => itemsByLibrary['lib-films'].find((item) => item.id === id);
const sharedById = (id) => itemsByLibrary['lib-shared-in'].find((item) => item.id === id);

const mixedResults = [
  // Fiction (owned, OWNER1): five entries, two of which carry the states this term exists for.
  fictionById('item-ampersand'),
  // The one deliberately coverless entry (`picture: null` on the source fixture) - the empty
  // frame sitting beside seven that have artwork, matching PRODUCT.md's "cover present is now
  // the normal case" framing.
  fictionById('item-1984'),
  // The one LENT entry (`lentTo: 'Marie'`) - what makes this term exercise the Overprint Stamp.
  fictionById('item-lent'),
  fictionById('item-aurore'),
  fictionById('item-mendiant'),
  // Films (owned, OWNER1): a second owned library, so the results span two of them, not one.
  filmsById('item-chinatown'),
  filmsById('item-armee'),
  // Polars (shared FROM marie@example.com, OWNER2): the one entry from a library this account
  // does not own - what makes this term exercise the Shared Ribbon beside the stamp above.
  sharedById('item-shared'),
];

// ---------------------------------------------------------------------------------------------
// TERM_SINGLE
// ---------------------------------------------------------------------------------------------

const singleResult = [fictionById('item-nadja')];

// ---------------------------------------------------------------------------------------------
// TERM_LARGE - 400 generated results. Hand-writing 400 candidates would bury the states that
// matter under volume nobody could review; a generator that documents its own ratios is the
// reviewable form. Follows src/test/fixtures/huge.js's own convention for bulk fixture data
// (a letter+padded-index title prefix, an `Auteur N`/`Réalisateur N` pool) rather than inventing
// a third generation style for the same kind of problem.
// ---------------------------------------------------------------------------------------------

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.toUpperCase().split('');
const COVER_COUNT = 6;

// Two owned libraries plus the one shared library, cycled - the same three this account can see
// results from in TERM_MIXED above, just at scale rather than hand-picked.
const LARGE_LIBRARIES = [
  { libraryId: 'lib-fiction', libraryName: 'Fiction', ownerId: 'OWNER1' },
  { libraryId: 'lib-films', libraryName: 'Films', ownerId: 'OWNER1' },
  { libraryId: 'lib-shared-in', libraryName: 'Polars', ownerId: 'OWNER2' },
];

const largeTitle = (n, isBook) => {
  const letter = LETTERS[n % LETTERS.length];
  // Mixed English/French, per PRODUCT.md's "the owner's actual collection... is mixed English
  // and French" - a fixture that is all-French or all-English would never exercise wrapping or
  // sorting against the case that actually occurs.
  const phrase = isBook
    ? n % 2 === 0
      ? 'Un roman sans particularité'
      : 'An Ordinary Paperback'
    : n % 2 === 0
      ? 'Un film sans particularité'
      : 'An Ordinary Feature';
  return `${letter}${String(n).padStart(4, '0')} ${phrase}`;
};

const largeResults = Array.from({ length: 400 }, (_, n) => {
  const isBook = n % 2 === 0;
  const lib = LARGE_LIBRARIES[n % LARGE_LIBRARIES.length];
  // ~90% carry artwork: PRODUCT.md states a cover is the NORMAL case, so a fixture that is
  // mostly-empty would misrepresent the stream this measurement has to survive (ui-v3.md's own
  // warning against "reasoning from the fixtures about how dense or sparse a real stream looks").
  // Omitted, not null, on the remaining ~10% - `picture` is `omitempty` on the real backend
  // (handlers/models.go:87), so absence is the correct shape, not an explicit null.
  const hasArtwork = n % 10 !== 0;

  const base = {
    id: `search-large-${n}`,
    type: isBook ? 0 : 1,
    title: largeTitle(n, isBook),
    ownerId: lib.ownerId,
    libraryId: lib.libraryId,
    libraryName: lib.libraryName,
    updatedAt: '2026-08-01T09:12:00Z',
    ...(hasArtwork ? { picture: cover((n % COVER_COUNT) + 1) } : {}),
  };

  return isBook
    ? {
        ...base,
        authors: [`Auteur ${n % 97}`],
        summary: 'Résumé indisponible.',
        isbn: `978${String(n).padStart(10, '0')}`,
      }
    : {
        ...base,
        directors: [`Réalisateur ${n % 97}`],
        cast: [],
        releaseYear: 1950 + (n % 70),
        duration: 90 + (n % 60),
        tmdbId: String(90000 + n),
      };
});

// ---------------------------------------------------------------------------------------------

const detectionKey = (terms) => (Array.isArray(terms) ? terms.join(' ') : '');

// Entry point wired into tools/mock-api.js for `POST /search`.
export const handleSearch = (body) => {
  const phrase = detectionKey(body?.terms);

  if (phrase === TERM_ERROR) {
    return { status: 500, body: { message: 'Search is temporarily unavailable' } };
  }

  if (phrase === TERM_NONE) {
    // The real backend's SearchResponse always carries `results` - Bluge returning zero hits is
    // an empty array, not an absent key, so a client checking `results.length` never has to
    // guard against `results` itself being undefined on a genuine miss.
    return { status: 200, body: { results: [] } };
  }

  if (phrase === TERM_SINGLE) return { status: 200, body: { results: singleResult } };
  if (phrase === TERM_LARGE) return { status: 200, body: { results: largeResults } };
  if (phrase === TERM_MIXED) return { status: 200, body: { results: mixedResults } };

  // Any other term: one clean match, for exploratory dev use while building screens that do not
  // care which state they are looking at - mirrors mock-detections.js's own default branches.
  // The constants above are what actually reach the states this route exists to serve; do not
  // screenshot a documented state off this branch.
  return { status: 200, body: { results: singleResult } };
};
