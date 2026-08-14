import { describe, expect, it } from 'vitest';
import { plateLineParts } from './format.js';

const book = (extra) => ({ type: 0, title: 'x', ...extra });
const film = (extra) => ({ type: 1, title: 'x', ...extra });

describe('plateLineParts', () => {
  it('gives a book its author and nothing else', () => {
    expect(plateLineParts(book({ authors: ['George Orwell'], isbn: '9780451524935' }))).toEqual({
      names: 'George Orwell',
      year: null,
    });
  });

  it('never surfaces an ISBN on a row — it aids identification, not recognition', () => {
    const parts = plateLineParts(book({ authors: ['A'], isbn: '9780451524935' }));
    expect(JSON.stringify(parts)).not.toContain('978');
  });

  it('gives a film its director and its year', () => {
    expect(
      plateLineParts(film({ directors: ['Roman Polanski'], releaseYear: 1974, duration: 130 })),
    ).toEqual({ names: 'Roman Polanski', year: '1974' });
  });

  it('never surfaces a runtime on a row — it decides what to watch, not what you own', () => {
    const parts = plateLineParts(film({ directors: ['X'], releaseYear: 1974, duration: 130 }));
    expect(JSON.stringify(parts)).not.toContain('130');
  });

  it('joins several names', () => {
    expect(plateLineParts(book({ authors: ['A', 'B'] })).names).toBe('A, B');
    expect(plateLineParts(film({ directors: ['A', 'B'] })).names).toBe('A, B');
  });

  it('reports an absent field as null rather than an empty string', () => {
    expect(plateLineParts(book({}))).toEqual({ names: null, year: null });
    expect(plateLineParts(film({ directors: [] }))).toEqual({ names: null, year: null });
  });
});
