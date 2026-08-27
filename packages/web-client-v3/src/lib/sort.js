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
// A title can fold to nothing, and that needs its own fallback — though not for the reason a
// leading accent alone would suggest. Stripping combining marks removes any mark that combines
// with a preceding letter; a title whose first character is a combining mark but is followed by
// ordinary letters still folds down to those letters. The fallback fires only when the WHOLE
// fold comes out empty — a title composed entirely of combining marks with nothing left once
// they are stripped. In that one case the client falls back to the title's raw, un-folded first
// character: a monumental letter showing nothing would be worse than an odd glyph, even though
// it means showing a character the server's own fold did NOT sort the title on. Only a
// genuinely empty title — which the API forbids — produces no label at all.
export const indexLetterFor = (title) => {
  const folded = foldForSort(title).charAt(0);
  if (folded) return folded.toUpperCase();
  return (title ?? '').charAt(0).toUpperCase();
};
