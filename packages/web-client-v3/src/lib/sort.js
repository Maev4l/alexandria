// The server's sort key is NormalizeForSort(title) — NFD, strip combining marks, NFC,
// lowercase (functions/internal/persistence/normalize.go). The client reproduces the fold to
// derive bucket labels and NEVER sorts: localeCompare would disagree with the paginated
// server order and make the sticky index letters non-monotonic.
export const foldForSort = (value) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .normalize('NFC')
    .toLowerCase();

// Nothing is collapsed: the label is always the actual folded first character, uppercased.
// `1984` files under 1, `Œuvres` under Œ, `&Sons` under &.
//
// An earlier version collapsed digits and ASCII punctuation into a single `#` bucket. That
// bought a handful of saved rows and cost the one thing an index letter exists for — telling
// the reader exactly where they are — and it invented a glyph that could not be drawn: `#` is
// four strokes crossing twice, and the 2px ink stroke that gives every other label its
// contrast collided with itself in the counters. Near-empty head buckets are rare, truthful
// and cheap.
//
// The empty case cannot arise from the API, which requires a title. It returns '' rather than
// inventing a bucket, so bad data shows as blank instead of being disguised as a real letter.
export const indexLetterFor = (title) => {
  const first = foldForSort(title).charAt(0);
  return first ? first.toUpperCase() : '';
};

// The index letter's treatment is bounded by the GLYPH, not patched per symbol. Alphanumerics
// — letters, digits, Œ, Æ, accented caps — are single-outline shapes that take the 2px ink
// stroke cleanly. Everything else drops to solid ink, which has no outline to collide with
// itself and holds at any weight and width for any character the data can produce: &, @, %, *
// and « all cross themselves and would all have broken a per-symbol fix.
export const isAlphanumericLabel = (label) => /^[\p{L}\p{N}]$/u.test(label ?? '');
