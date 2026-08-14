import { describe, expect, it } from 'vitest';
import { bookPlateLine, filmPlateLine } from './format.js';

describe('bookPlateLine', () => {
  it('reads author then ISBN', () => {
    expect(bookPlateLine({ authors: ['Raymond Chandler'], isbn: '9782070404209' })).toBe(
      'Raymond Chandler · 9782070404209',
    );
  });

  it('joins several authors', () => {
    expect(bookPlateLine({ authors: ['A', 'B'], isbn: '1' })).toBe('A, B · 1');
  });

  it('omits an absent field rather than printing an empty separator', () => {
    expect(bookPlateLine({ authors: [], isbn: '9782070404209' })).toBe('9782070404209');
    expect(bookPlateLine({ authors: ['A'] })).toBe('A');
    expect(bookPlateLine({})).toBe('');
  });
});

describe('filmPlateLine', () => {
  it('reads director, year and runtime with a prime mark', () => {
    expect(
      filmPlateLine({ directors: ['Roman Polanski'], releaseYear: 1974, duration: 130 }),
    ).toBe('Roman Polanski · 1974 · 130′');
  });

  it('omits a runtime of zero, which means unknown rather than instant', () => {
    expect(filmPlateLine({ directors: ['X'], releaseYear: 1974, duration: 0 })).toBe('X · 1974');
  });

  it('survives a film with nothing but a title', () => {
    expect(filmPlateLine({})).toBe('');
  });
});
