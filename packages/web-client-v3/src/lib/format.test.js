import { describe, expect, it } from 'vitest';
import { detailLineParts, plateLineParts } from './format.js';

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

// Detail carries IDENTIFICATION, which the row deliberately withholds. The ISBN,
// year and runtime are numerals, so they are returned apart from the names: only a numeral may
// take the mono face, and a name in mono is the category error the row's own line already
// refuses.
describe('detailLineParts', () => {
  it('gives a book its author and its ISBN, which the row never shows', () => {
    expect(
      detailLineParts(book({ authors: ['Raymond Chandler'], isbn: '9782070404209' })),
    ).toEqual({ names: 'Raymond Chandler', identifiers: ['9782070404209'] });
  });

  it('omits the ISBN identifier when absent, rather than inventing an empty one', () => {
    expect(detailLineParts(book({ authors: ['A'] }))).toEqual({ names: 'A', identifiers: [] });
  });

  it('gives a film its director, year and runtime, in that order', () => {
    expect(
      detailLineParts(
        film({ directors: ['Jean-Pierre Melville'], releaseYear: 1967, duration: 105 }),
      ),
    ).toEqual({ names: 'Jean-Pierre Melville', identifiers: ['1967', '105′'] });
  });

  it('marks the runtime with a prime, the catalogue convention for minutes', () => {
    const { identifiers } = detailLineParts(
      film({ directors: ['X'], releaseYear: 1974, duration: 130 }),
    );
    expect(identifiers[1]).toBe('130′');
  });

  it('reports absent fields as an empty identifiers list, never inventing one', () => {
    expect(detailLineParts(book({}))).toEqual({ names: null, identifiers: [] });
    expect(detailLineParts(film({ directors: [] }))).toEqual({ names: null, identifiers: [] });
  });

  it('never puts a name in the identifiers list, which is the mono-only column', () => {
    const { names, identifiers } = detailLineParts(
      book({ authors: ['Raymond Chandler'], isbn: '9782070404209' }),
    );
    expect(identifiers).not.toContain(names);
  });

  // duration is optional-and-omitted (omitempty) but explicitly permits 0
  // (CreateVideoRequest.duration: minimum 0) — a short/silent film is a real value, not an
  // absent one. A truthiness check (`item.duration ? ... : null`) would silently drop it, which
  // is exactly the failure the API's "optional fields are omitted, not null" constraint warns
  // against: test presence, never truthiness.
  it('keeps a runtime of 0 rather than treating it as absent', () => {
    const { identifiers } = detailLineParts(
      film({ directors: ['X'], releaseYear: 1974, duration: 0 }),
    );
    expect(identifiers).toContain('0′');
  });
});
