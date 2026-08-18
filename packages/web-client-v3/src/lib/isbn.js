// A book's own barcode is always 13 digits (EAN-13, which an ISBN-13 always is) or, for an
// older edition typed by hand, 10 — whose final character may be the checksum digit `X`
// (ISO 2108). Real-world ISBNs are commonly printed and typed with hyphens or spaces
// ("978-2-07-040420-9"), which this app never needs to keep, so they are stripped before
// counting rather than rejected.
const ISBN_10_OR_13 = /^[0-9]{9}[0-9Xx]$|^[0-9]{13}$/;

export const normalizeIsbn = (raw) => (raw ?? '').replace(/[\s-]/g, '');

// Returns the reader-facing reason a code cannot be looked up, or `null` when it can be — never
// a boolean, so the same call is both the validity check and the field's own error message
// (DESIGN.md's Field component prints whatever this returns directly under the input).
export const isbnError = (raw) => {
  const value = normalizeIsbn(raw);
  if (!value) return 'Enter an ISBN.';
  return ISBN_10_OR_13.test(value) ? null : 'Enter 10 or 13 digits.';
};
