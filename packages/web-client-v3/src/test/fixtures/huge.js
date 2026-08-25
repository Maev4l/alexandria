// A 1000-entry library, for the scale profile only. Deliberately NOT added to the `libraries`
// fixture: the library list's own tests assert its counts, and a profiling rig should not
// change what the product's tests see.
//
// Two things it has to reproduce faithfully or the profile measures nothing:
//   1. Enough entries to exceed any sane viewport many times over.
//   2. A collection that genuinely straddles a page boundary, so a continuation board merges
//      into one already on screen — the case that can drift the scroll position.
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.toUpperCase().split('');

// PRODUCT.md: artwork present is the normal case, not the exception, so this profile has to
// decode real covers at scale or it measures a stream that does not exist (see the P95_BUDGET_MS
// comment below, which was written for exactly this re-baseline). Cycles the same six tiny
// placeholders items.js uses — one every 10th item is left coverless, matching the "rare, not
// zero" empty-frame case PRODUCT.md describes, rather than either all-covered or all-empty.
const COVER_COUNT = 6;
const picture = (n) => (n % 10 === 0 ? null : `/mock-thumbnails/cover-${(n % COVER_COUNT) + 1}.webp`);

const book = (n) => {
  const letter = LETTERS[n % LETTERS.length];
  return {
    id: `huge-${n}`,
    type: 0,
    title: `${letter}${String(n).padStart(4, '0')} Un titre français très ordinaire`,
    ownerId: 'OWNER1',
    libraryId: 'lib-huge',
    libraryName: 'Scale',
    authors: [`Auteur ${n % 97}`],
    summary: 'Résumé.',
    isbn: `978${String(n).padStart(10, '0')}`,
    picture: picture(n),
    updatedAt: '2026-08-01T09:12:00Z',
  };
};

const member = (n, order) => ({
  ...book(n),
  title: `Série volume ${order}`,
  order,
  collectionId: 'huge-coll',
  collectionName: 'La Série Noire',
});

const board = (members, partial) => ({
  id: 'huge-coll',
  type: 2,
  title: 'La Série Noire',
  ownerId: 'OWNER1',
  libraryId: 'lib-huge',
  libraryName: 'Scale',
  description: 'Une longue série',
  itemCount: 60,
  ...(partial ? { partial: true } : {}),
  updatedAt: '2026-07-22T18:40:00Z',
  items: members,
});

// Sorted so the stream is monotonic, matching what the server would return.
const alphabetical = (a, b) => (a.title < b.title ? -1 : 1);

const standalone = Array.from({ length: 940 }, (_, i) => book(i)).toSorted(alphabetical);

// The board sits EARLY, at index 2, so that when its continuation arrives on page 2 the board
// is already far above the viewport — which is the only arrangement in which scroll drift can
// actually be observed. With the board late in page 1, the paging sentinel comes into range
// while the board is still on screen, and the merge happens before it has been scrolled past;
// the profile then reports "merge not observed" and measures nothing.
export const hugeItems = [
  ...standalone.slice(0, 2),
  // 30 of 60 members. Page 1 is indices 0-29, so the rest must land on page 2.
  board(
    Array.from({ length: 30 }, (_, i) => member(1000 + i, i + 1)),
    false,
  ),
  ...standalone.slice(2, 29),
  // Page 2 opens with the continuation, exactly as the API emits it.
  board(
    Array.from({ length: 30 }, (_, i) => member(1030 + i, i + 31)),
    true,
  ),
  ...standalone.slice(29),
];
