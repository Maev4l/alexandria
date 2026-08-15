import { describe, expect, it } from 'vitest';
import { foldForSort, indexLetterFor, isAlphanumericLabel } from './sort.js';

describe('foldForSort', () => {
  it('reproduces the server fold: strip diacritics, lowercase', () => {
    expect(foldForSort('Élan')).toBe('elan');
    expect(foldForSort('Amérique')).toBe('amerique');
    expect(foldForSort('ZAZIE')).toBe('zazie');
  });

  it('leaves ligatures alone, because NFD does not decompose them', () => {
    // Not a bug to fix: NormalizeForSort in the Go does the same, so the client must match
    // it or the sticky letters stop agreeing with the paginated order.
    expect(foldForSort('Œuvres')).toBe('œuvres');
    expect(foldForSort('Æther')).toBe('æther');
  });

  it('tolerates an absent title', () => {
    expect(foldForSort(undefined)).toBe('');
    expect(foldForSort(null)).toBe('');
  });
});

describe('indexLetterFor', () => {
  it('buckets plain letters under their uppercase form', () => {
    expect(indexLetterFor('Zazie dans le métro')).toBe('Z');
  });

  it('buckets a diacritic under its base letter, where the server sorts it', () => {
    expect(indexLetterFor('Élan')).toBe('E');
    expect(indexLetterFor('Amérique')).toBe('A');
    expect(indexLetterFor('Île')).toBe('I');
  });

  it('collapses nothing — a digit files under that digit', () => {
    // The label is always the real first character. A single # bucket saved a few rows and
    // cost the reader the one thing the letter is for, and invented an undrawable glyph.
    expect(indexLetterFor('1984')).toBe('1');
    expect(indexLetterFor('2001: A Space Odyssey')).toBe('2');
  });

  it('files punctuation under that punctuation', () => {
    expect(indexLetterFor('"Nightfall"')).toBe('"');
    expect(indexLetterFor('&Sons')).toBe('&');
  });

  it('shows a non-decomposing character as itself, because it sorts after Z', () => {
    // Folding this to "O" would send a reader to the Os, where it is not.
    expect(indexLetterFor('Œuvres complètes')).toBe('Œ');
    expect(indexLetterFor('Æneid')).toBe('Æ');
  });

  it('still finds a letter when a combining mark merely PRECEDES one', () => {
    // The mark is stripped and the letter behind it survives, so this is not the empty case.
    expect(indexLetterFor('\u0301abc')).toBe('A');
  });

  it('falls back to the raw character when the fold empties the title entirely', () => {
    // A title of nothing but combining marks folds away completely. A 76px band of nothing is
    // worse than an odd glyph, and the raw character is what the server sorted on.
    expect(indexLetterFor('\u0301')).toBe('\u0301');
    expect(indexLetterFor('')).toBe('');
    expect(indexLetterFor(undefined)).toBe('');
  });
});

describe('isAlphanumericLabel', () => {
  it('accepts letters, digits and ligatures — all single-outline glyphs', () => {
    ['A', 'Z', 'É', 'Œ', 'Æ', '1', '9'].forEach((label) => {
      expect(isAlphanumericLabel(label)).toBe(true);
    });
  });

  it('rejects every character that crosses itself and would collide under a stroke', () => {
    ['#', '&', '@', '%', '*', '«', '"'].forEach((label) => {
      expect(isAlphanumericLabel(label)).toBe(false);
    });
  });

  it('rejects an absent label', () => {
    expect(isAlphanumericLabel('')).toBe(false);
    expect(isAlphanumericLabel(undefined)).toBe(false);
  });
});
