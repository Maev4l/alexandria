import { describe, expect, it } from 'vitest';
import { appendPage, toLetterRuns } from './stream.js';

const book = (id, title) => ({ id, type: 0, title });
const board = (id, title, itemCount, items, partial = false) => ({
  id,
  type: 2,
  title,
  itemCount,
  items,
  ...(partial ? { partial: true } : {}),
});

describe('appendPage', () => {
  it('appends a page in the server order, without sorting', () => {
    const stream = appendPage([], [book('a', 'Zazie'), book('b', 'Amérique')]);
    expect(stream.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('merges a partial board into the board it continues', () => {
    const first = appendPage([], [board('c1', 'Melville', 4, [book('m1', 'Bob')])]);
    const second = appendPage(first, [
      board('c1', 'Melville', 4, [book('m2', 'Le Samouraï')], true),
      book('z', 'Zazie'),
    ]);
    // One collection, not two: rendering a second labelled board would show one collection
    // twice in a single stream, which reads as a data bug.
    expect(second).toHaveLength(2);
    expect(second[0].items.map((i) => i.id)).toEqual(['m1', 'm2']);
    expect(second[1].id).toBe('z');
  });

  it('clears the partial flag once the board is whole in the stream', () => {
    const first = appendPage([], [board('c1', 'Melville', 4, [book('m1', 'Bob')])]);
    const second = appendPage(first, [board('c1', 'Melville', 4, [book('m2', 'Doulos')], true)]);
    expect(second[0].partial).toBeFalsy();
  });

  it('keeps a partial board that has no predecessor, so it can label itself as continuing', () => {
    const stream = appendPage([], [board('c9', 'Orphan', 3, [book('o1', 'One')], true)]);
    expect(stream[0].partial).toBe(true);
  });

  it('does not mutate the stream it is given', () => {
    const original = [book('a', 'A')];
    appendPage(original, [book('b', 'B')]);
    expect(original).toHaveLength(1);
  });

  it('tolerates a page with no items', () => {
    expect(appendPage([book('a', 'A')], undefined)).toHaveLength(1);
  });
});

describe('toLetterRuns', () => {
  const stream = [
    book('n1', '1984'),
    book('a1', 'Amérique'),
    book('a2', 'Aurore'),
    board('c1', 'Melville', 12, [book('m1', 'Bob'), book('m2', 'Doulos')]),
    book('z1', 'Zazie'),
    book('o1', 'Œuvres complètes'),
  ];

  it('groups consecutive entries under one letter, head and tail included', () => {
    // 1984 files under 1, not a collapsed # bucket: nothing is collapsed.
    expect(toLetterRuns(stream).map((r) => r.letter)).toEqual(['1', 'A', 'M', 'Z', 'Œ']);
  });

  it('files a board under its own name, not its members', () => {
    const run = toLetterRuns(stream).find((r) => r.letter === 'M');
    expect(run.entries[0].id).toBe('c1');
  });

  it('counts items, not entries, so a board of twelve does not read as one', () => {
    const run = toLetterRuns(stream).find((r) => r.letter === 'M');
    expect(run.itemCount).toBe(12);
  });

  it('leaves the tail run open, because its count would still grow', () => {
    const runs = toLetterRuns(stream);
    expect(runs.at(-1).closed).toBe(false);
    expect(runs.slice(0, -1).every((r) => r.closed)).toBe(true);
  });

  it('closes every run when the stream is complete', () => {
    const runs = toLetterRuns(stream, { complete: true });
    expect(runs.every((r) => r.closed)).toBe(true);
  });

  it('returns nothing for an empty stream', () => {
    expect(toLetterRuns([])).toEqual([]);
  });
});
