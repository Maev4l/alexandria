import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { itemsApi } from '@/api';
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

  const runs = useMemo(
    () => toLetterRuns(entries, { complete: isComplete }),
    [entries, isComplete],
  );

  return { entries, runs, isLoading, isAppending, isComplete, error, loadMore, refresh };
};
