import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { itemsApi } from '@/api';
import { replaceById } from '@/lib/replaceById.js';
import { appendPage, toLetterRuns } from '@/lib/stream';

// A per-library paged stream. Pages append in the SERVER's order and are never re-sorted:
// the client's only job is to derive bucket labels.
export const useStream = (libraryId) => {
  const [entries, setEntries] = useState([]);
  const [nextToken, setNextToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppending, setIsAppending] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  // Guards against a scroll event firing loadMore twice before the first request settles.
  const inFlight = useRef(false);

  const load = useCallback(
    async (token) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setError(null);
      try {
        const page = await itemsApi.list(libraryId, { nextToken: token });
        setEntries((current) => appendPage(token ? current : [], page?.items ?? []));
        setNextToken(page?.nextToken ?? null);
        setIsComplete(!page?.nextToken);
      } catch (err) {
        setError(err.message);
      } finally {
        inFlight.current = false;
        setIsLoading(false);
        setIsAppending(false);
      }
    },
    [libraryId],
  );

  useEffect(() => {
    setEntries([]);
    setNextToken(null);
    setIsComplete(false);
    setIsLoading(true);
    load(null);
  }, [load]);

  const loadMore = useCallback(() => {
    if (!nextToken || inFlight.current) return;
    setIsAppending(true);
    load(nextToken);
  }, [load, nextToken]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    return load(null);
  }, [load]);

  const COLLECTION = 2;

  // Re-read ONE item and swap it in place, including inside a collection board. Reaching for
  // refresh() after every lend, return or edit sent the reader back to page one: in a 1000-item
  // library, returning a book filed under M put them at the top of the stream. refresh() is for
  // pull-to-refresh, where losing your place is what was asked for.
  const patchItem = useCallback(
    async (itemId) => {
      const fresh = await itemsApi.get(libraryId, itemId);
      setEntries((current) =>
        current.map((entry) => {
          if (entry.id === itemId) return fresh;
          if (entry.type !== COLLECTION) return entry;
          const items = entry.items ?? [];
          if (!items.some((member) => member.id === itemId)) return entry;
          return { ...entry, items: replaceById(items, fresh) };
        }),
      );
    },
    [libraryId],
  );

  // A deleted item is gone; there is nothing to re-read. Drop it where it stands rather than
  // reloading the stream around it.
  const dropItem = useCallback((itemId) => {
    setEntries((current) =>
      current
        .filter((entry) => entry.id !== itemId)
        .map((entry) =>
          entry.type === COLLECTION && entry.items
            ? { ...entry, items: entry.items.filter((member) => member.id !== itemId) }
            : entry,
        ),
    );
  }, []);

  const runs = useMemo(
    () => toLetterRuns(entries, { complete: isComplete }),
    [entries, isComplete],
  );

  return {
    entries,
    runs,
    isLoading,
    isAppending,
    isComplete,
    error,
    loadMore,
    refresh,
    patchItem,
    dropItem,
  };
};
