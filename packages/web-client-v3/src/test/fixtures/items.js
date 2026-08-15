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
// - an absent picture, and a picture URL that 404s because the thumbnail is not made yet
// - a lent item
// - a collection split across the page boundary at index 10
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
  book('item-ampersand', '&Sons', { authors: ['David Gilbert'] }),
  book('item-1984', '1984', { authors: ['George Orwell'], isbn: '9780451524935' }),
  book('item-amerique', 'Amérique', { authors: ['Franz Kafka'] }),
  book('item-aurore', 'Aurore', { authors: ['Michel Tournier'] }),
  book('item-lent', 'Le Grand Sommeil', {
    authors: ['Raymond Chandler'],
    isbn: '9782070404209',
    lentTo: 'Marie',
  }),
  book('item-mendiant', 'Le Mendiant de Jérusalem', { authors: ['Elie Wiesel'] }),
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
      film('item-bob', 'Bob le flambeur', { ...inCollection(1), releaseYear: 1956, duration: 102 }),
      film('item-doulos', 'Le Doulos', { ...inCollection(2), releaseYear: 1962, duration: 108 }),
      film('item-samourai', 'Le Samouraï', { ...inCollection(3), releaseYear: 1967, duration: 105 }),
      film('item-cercle', 'Le Cercle rouge', { ...inCollection(4), releaseYear: 1970, duration: 140 }),
    ],
  },
  book('item-nadja', 'Nadja', { authors: ['André Breton'] }),
  book('item-broken', 'Pêcheur d’Islande', {
    authors: ['Pierre Loti'],
    // A thumbnail that has not been produced yet: the URL exists and 404s.
    picture: 'https://alexandria.isnan.eu/thumbnails/user/OWNER1/library/lib-fiction/item/missing',
  }),
  book('item-voyage', 'Voyage au bout de la nuit', { authors: ['Louis-Ferdinand Céline'] }),
  book('item-zazie', 'Zazie dans le métro', { authors: ['Raymond Queneau'] }),
  // œ survives the fold and sorts after z, so this is genuinely last.
  book('item-oeuvres', 'Œuvres complètes', { authors: ['Arthur Rimbaud'] }),
];

export const itemsByLibrary = {
  'lib-fiction': fictionItems,
  'lib-films': [
    film('item-armee', 'L’Armée des ombres', {
      libraryId: 'lib-films',
      libraryName: 'Films',
      releaseYear: 1969,
      duration: 145,
    }),
    film('item-chinatown', 'Chinatown', {
      libraryId: 'lib-films',
      libraryName: 'Films',
      directors: ['Roman Polanski'],
      releaseYear: 1974,
      duration: 130,
    }),
  ],
  'lib-empty': [],
  'lib-shared-in': [
    book('item-shared', 'Le Grand Meaulnes', {
      libraryId: 'lib-shared-in',
      libraryName: 'Polars',
      ownerId: 'OWNER2',
      authors: ['Alain-Fournier'],
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

export const searchResults = [
  fictionItems[0],
  fictionItems[3],
  itemsByLibrary['lib-shared-in'][0],
];
