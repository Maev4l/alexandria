import { beforeEach, describe, expect, it } from 'vitest';
import { RECENTS_MAX, addRecent, clearRecents, readRecents } from './recentSearches.js';

// The cap is FIVE (ui-v3.md § Search). An earlier draft of the plan said eight; the spec is the
// authority and this test is what stops the number drifting back.

beforeEach(() => {
  localStorage.clear();
});

describe('recent searches', () => {
  it('caps at five, most recent first', () => {
    for (const term of ['one', 'two', 'three', 'four', 'five', 'six', 'seven']) addRecent(term);

    expect(RECENTS_MAX).toBe(5);
    expect(readRecents()).toEqual(['seven', 'six', 'five', 'four', 'three']);
  });

  it('de-duplicates, moving a repeat back to the front rather than listing it twice', () => {
    addRecent('melville');
    addRecent('chandler');
    addRecent('melville');

    expect(readRecents()).toEqual(['melville', 'chandler']);
  });

  it('treats two casings of one query as one entry, because the server lowercases terms anyway', () => {
    addRecent('Melville');
    addRecent('melville');

    expect(readRecents()).toEqual(['melville']);
  });

  it('never folds accents — two spellings the server would treat differently stay apart', () => {
    // The backend lowercases and does NOT fold accents; folding here would collapse two entries
    // that reach the index as different queries, and re-running the survivor could not reproduce
    // the other's results.
    addRecent('étranger');
    addRecent('etranger');

    expect(readRecents()).toEqual(['etranger', 'étranger']);
  });

  it('collapses a prefix the reader typed through on the way to a longer query', () => {
    // Search runs on a debounced value, so a pause mid-word records a prefix. Keeping both would
    // spend two of five slots on one intent.
    addRecent('rom');
    addRecent('roman');

    expect(readRecents()).toEqual(['roman']);
  });

  // THE OTHER DIRECTION, and it is what makes the prefix rule safe to have. Collapsing is
  // deliberately ASYMMETRIC: a typing artefact is always a prefix of the term it was on the way
  // to, so dropping prefixes removes artefacts — while a LATER, deliberate shorter search must
  // survive, because `roman` is not a prefix of a subsequent `rom`. A symmetric rule would eat a
  // real search the reader had just chosen to run.
  it('keeps a deliberately shorter search made AFTER a longer one', () => {
    addRecent('roman');
    expect(addRecent('rom')).toEqual(['rom', 'roman']);
  });

  it('ignores blank input', () => {
    addRecent('roman');
    addRecent('   ');

    expect(readRecents()).toEqual(['roman']);
  });

  it('clears everything, and returns the empty list so a caller need not re-read', () => {
    addRecent('roman');

    expect(clearRecents()).toEqual([]);
    expect(readRecents()).toEqual([]);
  });

  it('survives a corrupt or foreign value in its storage key', () => {
    localStorage.setItem('alexandria.v3.recent-searches', '{not json');
    expect(readRecents()).toEqual([]);

    localStorage.setItem('alexandria.v3.recent-searches', '{"nope":1}');
    expect(readRecents()).toEqual([]);
  });
});
