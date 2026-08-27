// `picture` is served for real by the fixture server (tools/mock-covers.js), not a `data:` URI —
// see the header comment below for why. `cover(n)` names one of the six tiny placeholder covers
// in tools/fixture-covers/; every `book`/`film` takes one by default, because PRODUCT.md now
// states artwork present is the NORMAL case. Call sites that must render the empty or the
// failed-load state override it explicitly (`picture: null` / the 404ing URL), so that override
// is visible at the call site rather than buried in a default.
const cover = (n) => `/mock-thumbnails/cover-${n}.webp`;

const book = (id, title, extra = {}) => ({
  id,
  type: 0,
  title,
  ownerId: 'OWNER1',
  libraryId: 'lib-fiction',
  libraryName: 'Fiction',
  authors: ['Anonyme'],
  summary: 'Résumé indisponible.',
  isbn: '9780000000000',
  picture: cover(1),
  updatedAt: '2026-08-01T09:12:00Z',
  ...extra,
});

const film = (id, title, extra = {}) => ({
  id,
  type: 1,
  title,
  ownerId: 'OWNER1',
  libraryId: 'lib-fiction',
  libraryName: 'Fiction',
  directors: ['Jean-Pierre Melville'],
  cast: ['Alain Delon', 'Nathalie Delon', 'François Périer'],
  summary: 'Un tueur à gages méthodique.',
  releaseYear: 1967,
  duration: 105,
  tmdbId: '10574',
  picture: cover(2),
  updatedAt: '2026-07-22T18:40:00Z',
  ...extra,
});

const inCollection = (order) => ({
  order,
  collectionId: 'coll-melville',
  collectionName: 'Melville',
});

// The awkward cases the design must survive, each present exactly once:
// - a digit-leading title and an OE-leading title, which bucket outside A-Z
// - diacritics, which fold into their base letter
// - a lent item
// - a collection split across the page boundary at index 10
// - the two real cover-failure states, each modelling a DIFFERENT fact (PRODUCT.md): item-1984
//   has no `picture` at all — the rare case where the collection genuinely lacks a cover — and
//   item-broken's `picture` 404s while its `pictureUrl` exists — the common, transient case
//   where the thumbnail just hasn't been produced yet. Every OTHER item below carries a real,
//   loading `picture`, because PRODUCT.md now states that is the normal case, not the exception
//   these two are pinned to illustrate.
// IN THE SERVER'S FOLD ORDER — NFD, strip combining marks, NFC, lowercase — because the client
// is faithful to whatever order it is given and never sorts. A fixture out of fold order makes
// the index letters render non-monotonically, which looks like a client bug and is not one.
// Verify with: foldForSort(a) <= foldForSort(b) for every adjacent pair.
//
// So: & (0x26) before digits, digits before letters, and œ after z.
//
// The cross-page collection split is NOT modelled here: this library is smaller than one page,
// so the server would never emit a continuation for it. That case lives in huge.js, where it is
// real. Modelling it here produced two entries for one collection inside a single response,
// which no server does.
export const fictionItems = [
  book('item-ampersand', '&Sons', { authors: ['David Gilbert'], picture: cover(3) }),
  // The one deliberately coverless item: no `picture` field at all. Pinned by
  // check-browser.mjs's "empty hero frame is unfilled" check, which needs a genuinely empty
  // frame to sample — not a 404ing one, which is a different state (see item-broken below).
  book('item-1984', '1984', { authors: ['George Orwell'], isbn: '9780451524935', picture: null }),
  book('item-amerique', 'Amérique', { authors: ['Franz Kafka'], picture: cover(5) }),
  book('item-aurore', 'Aurore', { authors: ['Michel Tournier'], picture: cover(6) }),
  book('item-lent', 'Le Grand Sommeil', {
    authors: ['Raymond Chandler'],
    isbn: '9782070404209',
    lentTo: 'Marie',
    picture: cover(2),
  }),
  book('item-mendiant', 'Le Mendiant de Jérusalem', { authors: ['Elie Wiesel'], picture: cover(4) }),
  {
    id: 'coll-melville',
    type: 2,
    title: 'Melville',
    ownerId: 'OWNER1',
    libraryId: 'lib-fiction',
    libraryName: 'Fiction',
    description: 'Jean-Pierre Melville, dans l’ordre de sortie',
    itemCount: 4,
    updatedAt: '2026-07-22T18:40:00Z',
    // Members run in `order`, not alphabetically — a board filed under "S" can open with
    // "Aliens" and that is correct, since every member's own plate already carries its number.
    items: [
      film('item-bob', 'Bob le flambeur', {
        ...inCollection(1),
        releaseYear: 1956,
        duration: 102,
        picture: cover(1),
      }),
      film('item-doulos', 'Le Doulos', {
        ...inCollection(2),
        releaseYear: 1962,
        duration: 108,
        picture: cover(3),
      }),
      film('item-samourai', 'Le Samouraï', {
        ...inCollection(3),
        releaseYear: 1967,
        duration: 105,
        picture: cover(5),
      }),
      film('item-cercle', 'Le Cercle rouge', {
        ...inCollection(4),
        releaseYear: 1970,
        duration: 140,
        picture: cover(6),
      }),
    ],
  },
  book('item-nadja', 'Nadja', { authors: ['André Breton'], picture: cover(1) }),
  book('item-broken', 'Pêcheur d’Islande', {
    authors: ['Pierre Loti'],
    // A thumbnail that has not been produced yet: the URL exists and 404s (a real, unreachable
    // path on the production domain — not served by the fixture server, so it reliably fails
    // rather than resolving to a mock 200). `pictureUrl` is the detection source that WOULD
    // produce it — present here so this item also exercises the "Fetch cover" repair control on
    // item detail (gated on both facts at once). This is the DOMINANT real cover
    // failure (PRODUCT.md) — common and transient — which is why it stays, deliberately, even
    // though it is now one of only two coverless items in this fixture rather than one of eleven.
    picture: 'https://alexandria.isnan.eu/thumbnails/user/OWNER1/library/lib-fiction/item/missing',
    pictureUrl: 'https://covers.example.test/pecheur-islande.jpg',
  }),
  book('item-voyage', 'Voyage au bout de la nuit', { authors: ['Louis-Ferdinand Céline'], picture: cover(2) }),
  book('item-zazie', 'Zazie dans le métro', { authors: ['Raymond Queneau'], picture: cover(4) }),
  // œ survives the fold and sorts after z, so this is genuinely last.
  book('item-oeuvres', 'Œuvres complètes', { authors: ['Arthur Rimbaud'], picture: cover(6) }),
];

export const itemsByLibrary = {
  'lib-fiction': fictionItems,
  // Folded order (NFD, strip combining marks, NFC, lowercase — the server's fold, which the
  // client reproduces to label buckets but never uses to sort): 'chinatown' before
  // 'l’armee des ombres' — 'c' < 'l'. The fixture used to list "L'Armée" first, which rendered
  // index letters L then C: non-monotonic, and a client-side sort would have masked it rather
  // than fixing the actual bug, which is server-order fidelity in the fixture itself.
  'lib-films': [
    film('item-chinatown', 'Chinatown', {
      libraryId: 'lib-films',
      libraryName: 'Films',
      directors: ['Roman Polanski'],
      releaseYear: 1974,
      duration: 130,
      picture: cover(3),
    }),
    film('item-armee', 'L’Armée des ombres', {
      libraryId: 'lib-films',
      libraryName: 'Films',
      releaseYear: 1969,
      duration: 145,
      picture: cover(5),
    }),
  ],
  'lib-empty': [],
  'lib-shared-in': [
    book('item-shared', 'Le Grand Meaulnes', {
      libraryId: 'lib-shared-in',
      libraryName: 'Polars',
      ownerId: 'OWNER2',
      authors: ['Alain-Fournier'],
      picture: cover(4),
    }),
  ],
};

export const collectionsByLibrary = {
  'lib-fiction': [
    {
      id: 'coll-melville',
      name: 'Melville',
      description: 'Jean-Pierre Melville, dans l’ordre de sortie',
      itemCount: 4,
    },
  ],
  'lib-films': [],
  'lib-empty': [],
  'lib-shared-in': [],
};
