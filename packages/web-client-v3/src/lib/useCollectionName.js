import { useEffect, useState } from 'react';
import { collectionsApi } from '@/api';

// Best-effort collection-name lookup, shared by every screen that needs to print
// `Filing into <name>` (`FilingInto.jsx`) — the two capture screens (AddBook, AddVideo), where a
// cataloguing session actually SITS, and the two candidate-list screens
// (BookDetectionResults, VideoDetectionResults) it passes through briefly, N times per session
// (added to the capture screens after the design session found the mark missing from the screen
// the reader spends the whole session on).
//
// A failed lookup here must never block anything else the screen can do — the mark it feeds is a
// courtesy telling the reader the session still remembers their board, not a gate — so a rejected
// promise is swallowed rather than surfaced. With no `collectionId` at all, this resolves to
// `null` immediately and fetches nothing: absence of the mark is what says "standalone", so a
// screen with no collection must never show a stale name from a previous mount.
export const useCollectionName = (libraryId, collectionId) => {
  const [collectionName, setCollectionName] = useState(null);

  useEffect(() => {
    if (!collectionId) {
      setCollectionName(null);
      return undefined;
    }
    let cancelled = false;
    collectionsApi
      .get(libraryId, collectionId)
      .then((collection) => {
        if (!cancelled) setCollectionName(collection?.name ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [libraryId, collectionId]);

  return collectionName;
};
