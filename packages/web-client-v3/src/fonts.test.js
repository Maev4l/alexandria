// Reads the actual shipped woff2 binaries and asserts required glyph coverage.
//
// This is the deliverable the P0 report calls for: the fonts were the symptom, this check is
// what stops it recurring. The prior defect was invisible for three review passes because the
// comp (docs/ui-design/ui-v3-mockup.html) names "Archivo" with no @font-face at all, so both
// sides fell back to system-ui identically — reproduction matched the comp, and matching was
// mistaken for correct. A byte-level assertion over the committed font files cannot be fooled
// that way: it does not care what the comp rendered, only what the shipped binary can render.
//
// fontkit (not a Node built-in) is required to parse a woff2's cmap: woff2 is brotli-compressed
// sfnt, so reading it means decompressing the stream and walking the table directory, which no
// Node API does. fontkit was chosen over shelling out to Python's fontTools because it is a
// plain JS/WASM dependency of the project itself (`yarn add`, exact-pinned below) — no assumption
// that a Python interpreter or a `fonttools` install exists on whatever machine runs `yarn test`,
// which a shell-out would silently need and silently skip without. A check that quietly no-ops
// when its interpreter is missing is the exact failure class this task exists to close.
import fs from 'fs';
import path from 'path';
import { openSync } from 'fontkit';
import { describe, expect, it } from 'vitest';

const FONTS_DIR = path.resolve(process.cwd(), 'public/fonts');

// Each family ships as two files — "latin" (ASCII + Latin-1) and "latin-ext" (Latin Extended-A)
// — because Google serves them as two disjoint woff2 files, never one covering both (see
// scripts/fetch-fonts.mjs). A browser's unicode-range mechanism picks whichever file covers a
// given character, so the correct thing to assert is the UNION of both files' glyph coverage,
// which is what a reader's browser actually has available for this family.
const FAMILIES = {
  Archivo: ['archivo-var-latin.woff2', 'archivo-var-latin-ext.woff2'],
  'Chivo Mono': ['chivo-mono-var-latin.woff2', 'chivo-mono-var-latin-ext.woff2'],
};

const loadFamily = (files) => {
  const fonts = files.map((file) => {
    const full = path.join(FONTS_DIR, file);
    if (!fs.existsSync(full)) {
      throw new Error(`fonts.test: ${file} is not present in public/fonts — run "yarn fonts"`);
    }
    return openSync(full);
  });
  // hasGlyphForCodePoint on ANY of the family's files is coverage for that family, mirroring
  // the browser's own per-glyph unicode-range fallback across @font-face blocks.
  return (codePoint) => fonts.some((font) => font.hasGlyphForCodePoint(codePoint));
};

const codePointName = (cp) =>
  `U+${cp.toString(16).toUpperCase().padStart(4, '0')} "${String.fromCodePoint(cp)}"`;

// Printable ASCII: the entire product's Latin UI copy and English content lives here. This is
// the range that measured almost entirely ABSENT before the fix (only space and 'A' present).
const ASCII_PRINTABLE = Array.from({ length: 0x7f - 0x20 }, (_, i) => 0x20 + i);

// Latin-1 accented letters — À through ÿ, excluding × (U+00D7) and ÷ (U+00F7), which sit in the
// same block but are math symbols, not letters. Every listed French diacritic below is already
// inside this range; it is asserted as its own block because Latin-1 in general (not just the
// nine characters below) has to render for names, titles and summaries in the real collection.
const LATIN1_LETTERS = Array.from({ length: 0xff - 0xc0 + 1 }, (_, i) => 0xc0 + i).filter(
  (cp) => cp !== 0xd7 && cp !== 0xf7,
);

// Latin Extended-A, the full block (U+0100–U+017F). The design system's index alphabet
// (DESIGN.md §4 "The index alphabet") depends on this range: NFD-folding does not decompose Œ/Æ,
// so folded titles can bucket under letters anywhere in this block, not just the ones already
// known to appear in the fixture data today.
const LATIN_EXTENDED_A = Array.from({ length: 0x17f - 0x100 + 1 }, (_, i) => 0x100 + i);

// Explicit characters named by the report as the minimum bar, plus what the source sweep below
// found actually rendered as text (never mere comments) elsewhere in src/.
const FRENCH_DIACRITICS = [...'éèàùçîôëï'].map((c) => c.codePointAt(0));
const OE_AE_LIGATURES = [...'ŒÆœæ'].map((c) => c.codePointAt(0));
const MIDDOT = 0xb7; // '·' — every Plate Line ("AUTHOR · ISBN"), OverprintStamp, SharedRibbon.
// '→' is no longer rendered anywhere: LedgerRow.jsx dropped the "out → back" connector
// (DESIGN.md ruling, ui-v3.md) precisely because this glyph is absent from both faces. The
// constant and the confirmation test below stay — they document a verified upstream gap, not
// current usage, and exist so a future re-introduction of the glyph is caught here first.
const RIGHTWARDS_ARROW = 0x2192;

// Source sweep (excluding comments, which do not render): the other literal non-ASCII
// characters this codebase actually puts on screen, beyond the report's own named minimum.
// Each is legitimately reachable via either family's General Punctuation coverage (U+2000–
// U+206F), which both "latin" cuts declare — see EditCollection.jsx / NewCollection.jsx
// (curly quotes in the duplicate-name error), Libraries.jsx / ItemHistory.jsx (em dash), and
// lib/format.js (prime mark for film runtime, "118′"). LedgerRow.jsx does NOT use the em dash:
// an earlier round of this fix stood one in for an unresolved loan's missing return date
// (`RETURNED —`), but that restated in a weaker form what the duration slot already says
// plainly ("no return recorded") — so the row states `LENT <date>` alone instead, the same
// shape as an open loan, distinguished only by that duration slot (and, when boxed, the stamp).
const OTHER_RENDERED_PUNCTUATION = {
  'em dash — (Libraries.jsx, ItemHistory.jsx, …)': 0x2014,
  'left double quotation mark " (EditCollection.jsx, NewCollection.jsx)': 0x201c,
  'right double quotation mark " (EditCollection.jsx, NewCollection.jsx)': 0x201d,
  "right single quotation mark ’ (fixtures: l’ordre, d’Islande, …)": 0x2019,
  'prime ′ (lib/format.js, film runtime "118′")': 0x2032,
};

describe.each(Object.entries(FAMILIES))('%s — shipped woff2 glyph coverage', (family, files) => {
  const hasGlyph = loadFamily(files);

  it.each(ASCII_PRINTABLE)('has printable ASCII %s', (cp) => {
    expect(hasGlyph(cp), `missing ${codePointName(cp)}`).toBe(true);
  });

  it.each(LATIN1_LETTERS)('has Latin-1 letter %s', (cp) => {
    expect(hasGlyph(cp), `missing ${codePointName(cp)}`).toBe(true);
  });

  it.each(LATIN_EXTENDED_A)('has Latin Extended-A %s', (cp) => {
    expect(hasGlyph(cp), `missing ${codePointName(cp)}`).toBe(true);
  });

  it.each(FRENCH_DIACRITICS)('has French diacritic %s', (cp) => {
    expect(hasGlyph(cp), `missing ${codePointName(cp)}`).toBe(true);
  });

  it.each(OE_AE_LIGATURES)('has OE/AE ligature %s', (cp) => {
    expect(hasGlyph(cp), `missing ${codePointName(cp)}`).toBe(true);
  });

  it('has the middot used in every Plate Line', () => {
    expect(hasGlyph(MIDDOT), `missing ${codePointName(MIDDOT)}`).toBe(true);
  });

  it.each(Object.entries(OTHER_RENDERED_PUNCTUATION))('has %s', (_label, cp) => {
    expect(hasGlyph(cp), `missing ${codePointName(cp)}`).toBe(true);
  });

  // NOT a requirement: this documents a verified, upstream gap rather than asserting one.
  // Neither Archivo v25 nor Chivo Mono v11 includes U+2192 in ANY cut Google serves for
  // either family — checked all three (vietnamese, latin-ext, latin); latin declares U+2191
  // and U+2193 (up/down) individually but never U+2192. No amount of correct subsetting on
  // our part produces this glyph: it is not in the upstream font at all. LedgerRow.jsx used to
  // render it (`out → back`, styled `.num` → Chivo Mono), which fell back, for that one glyph
  // only, to the CSS stack's `ui-monospace, monospace` — a mixed-face line in a system that
  // names exactly two faces. The design ruling replaced the connector with labelling both
  // endpoints (`LENT <date>`, `LENT <date> · RETURNED <date>`) rather than working around the
  // gap, so nothing in this codebase renders U+2192 any more — this test and the constant above
  // stay only as a record of *why*, so the gap is not silently "fixed" by re-introducing a
  // glyph neither shipped font actually draws. If a future Google release adds the glyph, this
  // assertion flips to `true` and must fail loudly here, forcing this comment to be corrected
  // rather than silently going stale.
  it('confirms the rightwards arrow is a known, unfixable gap in the upstream font (not ours to close by re-fetching)', () => {
    expect(hasGlyph(RIGHTWARDS_ARROW)).toBe(false);
  });
});
