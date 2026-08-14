import { describe, expect, it } from 'vitest';
import { foldForSort, indexLetterFor } from './sort.js';

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

  it('collapses digits and ASCII punctuation into one head bucket', () => {
    // They all sort below "a" contiguously, so one bucket is truthful and ten near-empty
    // ones are noise.
    expect(indexLetterFor('1984')).toBe('#');
    expect(indexLetterFor('2001: A Space Odyssey')).toBe('#');
    expect(indexLetterFor('"Nightfall"')).toBe('#');
    expect(indexLetterFor("'Tis")).toBe('#');
  });

  it('shows a non-decomposing character as itself, because it sorts after Z', () => {
    // Folding this to "O" would send a reader to the Os, where it is not.
    expect(indexLetterFor('Œuvres complètes')).toBe('Œ');
    expect(indexLetterFor('Æneid')).toBe('Æ');
  });

  it('buckets an empty or absent title at the head rather than throwing', () => {
    expect(indexLetterFor('')).toBe('#');
    expect(indexLetterFor(undefined)).toBe('#');
  });
});
