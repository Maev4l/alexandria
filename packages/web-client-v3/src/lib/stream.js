import { indexLetterFor } from './sort.js';

const COLLECTION = 2;

// The API emits a collection that spans a page boundary as `partial: true` at the TOP of the
// continuation page (repositories/dynamodb/items.go:838-842). Merging it back into its
// predecessor is better than labelling a second board: the reader ends up with one collection,
// which is what it is, and two boards for one collection reads as a data bug. A partial board
// with no predecessor keeps its flag so it can say it continues.
export const appendPage = (stream, pageItems = []) => {
  const next = stream.slice();
  const boardIndex = new Map();
  next.forEach((entry, i) => {
    if (entry.type === COLLECTION) boardIndex.set(entry.id, i);
  });

  for (const entry of pageItems ?? []) {
    if (entry.type === COLLECTION && entry.partial && boardIndex.has(entry.id)) {
      const i = boardIndex.get(entry.id);
      next[i] = { ...next[i], items: [...(next[i].items ?? []), ...(entry.items ?? [])] };
      continue;
    }
    if (entry.type === COLLECTION) boardIndex.set(entry.id, next.length);
    next.push(entry);
  }

  return next;
};

const entryItemCount = (entry) => (entry.type === COLLECTION ? (entry.itemCount ?? 0) : 1);

// A run is CLOSED the moment a different letter appears after it: at that instant its item
// count is final and correct. The run still at the tail of the loaded stream stays open and
// shows no count, because a number that grows while the reader looks at it is worse than no
// number. The count is ITEMS, not entries — a letter holding one board of twelve reads "12".
export const toLetterRuns = (stream, { complete = false } = {}) => {
  const runs = [];

  for (const entry of stream) {
    const letter = indexLetterFor(entry.title);
    const last = runs.at(-1);
    if (last && last.letter === letter) {
      last.entries.push(entry);
      last.itemCount += entryItemCount(entry);
    } else {
      // The key is the run's position, not its letter: the client never sorts, so if the server
      // ever returns a letter twice — or a fixture is wrong — two runs share a letter and a
      // letter key collides in React.
      runs.push({
        key: `${runs.length}-${letter}`,
        letter,
        entries: [entry],
        itemCount: entryItemCount(entry),
        closed: true,
      });
    }
  }

  if (runs.length > 0 && !complete) runs.at(-1).closed = false;
  return runs;
};
