// Recent searches, per ui-v3.md § Search: at most five, most recent first, de-duplicated,
// persisted in localStorage.
//
// FIVE, not eight. The number is the spec's; an earlier draft of the plan said eight, and
// recentSearches.test.js is what stops it drifting back.

const KEY = 'alexandria.v3.recent-searches';

export const RECENTS_MAX = 5;

// Every read is defensive. This key is written by us but READ from a store the reader's browser
// owns — another tab, an older build, or a hand-edited value can leave anything at all here, and
// a throw from JSON.parse on mount would take the whole search surface down with it.
const readAll = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((term) => typeof term === 'string') : [];
  } catch {
    return [];
  }
};

const write = (terms) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(terms));
  } catch {
    // A full or disabled store costs the reader a convenience, never the search itself.
  }
};

export const readRecents = () => readAll().slice(0, RECENTS_MAX);

// Two entries are "the same search" when they differ only in CASE, because the backend
// lowercases terms before querying the index — so the two would return identical results and
// listing both spends two of five slots on one intent.
//
// ACCENTS ARE NOT FOLDED, here or anywhere else in this client. `etranger` and `étranger` reach
// Bluge as different queries (it lowercases and does not fold), and only its fuzziness makes the
// first find the second — so collapsing them here would keep one entry that cannot reproduce the
// other's results.
//
// A PREFIX of the new term is dropped too: search runs on a debounced value, so a reader who
// pauses mid-word records `rom` on the way to `roman`. Both are the same intent, and the longer
// one is the one they meant.
export const addRecent = (term) => {
  const value = term.trim();
  if (!value) return readRecents();

  const key = value.toLowerCase();
  const kept = readAll().filter((existing) => !key.startsWith(existing.toLowerCase()));
  const next = [value, ...kept].slice(0, RECENTS_MAX);
  write(next);
  return next;
};

// No confirmation anywhere near this: the list is a convenience, nothing in it is data the
// reader created, and re-running a search rebuilds it.
export const clearRecents = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Same reasoning as write(): the in-memory list below is what the reader sees regardless.
  }
  return [];
};
