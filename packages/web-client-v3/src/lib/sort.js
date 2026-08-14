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

// Codepoints below 'a' are the ASCII digits and punctuation, which all sort contiguously
// ahead of the letters. One truthful bucket beats ten near-empty ones.
const FIRST_LETTER_CODE = 0x61;

export const indexLetterFor = (title) => {
  const first = foldForSort(title).charAt(0);
  if (!first) return '#';
  if (first.charCodeAt(0) < FIRST_LETTER_CODE) return '#';
  // a-z gives A-Z; anything above z (œ, æ, «) survived the fold and sorts at the tail, so it
  // shows as itself rather than as a fake letter that would send a reader to the wrong place.
  return first.toUpperCase();
};
