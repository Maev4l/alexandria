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
// the reader exactly where they are — for a saving that turned out not to be needed: `#` reads
// fine on its own (IndexLetter.jsx; scripts/check-index-letter.mjs measures its fill at 96%+ one
// connected piece in the real Archivo binary). Near-empty head buckets are rare, truthful and
// cheap regardless.
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
