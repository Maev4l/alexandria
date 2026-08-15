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
// A title can fold to nothing even when it is not empty: one whose first character is a bare
// combining mark loses it to the NFD strip. Falling back to the RAW first character keeps the
// label honest — a 76px band of nothing is worse than an odd glyph, and the reader is still
// shown the character the server sorted on. Only a genuinely empty title yields no label, which
// the API forbids.
export const indexLetterFor = (title) => {
  const folded = foldForSort(title).charAt(0);
  if (folded) return folded.toUpperCase();
  return (title ?? '').charAt(0).toUpperCase();
};

// The index letter's treatment is bounded by the GLYPH, not patched per symbol. Alphanumerics
// — letters, digits, Œ, Æ, accented caps — are single-outline shapes that take the 2px ink
// stroke cleanly. Everything else drops to solid ink, which has no outline to collide with
// itself and holds at any weight and width for any character the data can produce: &, @, %, *
// and « all cross themselves and would all have broken a per-symbol fix.
export const isAlphanumericLabel = (label) => /^[\p{L}\p{N}]$/u.test(label ?? '');
