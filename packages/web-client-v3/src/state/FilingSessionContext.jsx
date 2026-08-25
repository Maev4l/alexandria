import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';

const FilingSessionContext = createContext(null);

// How many items the CURRENT cataloguing session has filed, and nothing else.
//
// "Session" is defined here, precisely, by where this provider is mounted: `AddFlowLayout`
// renders it as the layout route wrapping the four add-flow routes (routes.jsx), so it stays mounted for as long as the reader
// is inside the flow — across AddBook -> results -> AddBook, however many times — and unmounts,
// resetting to zero, the moment they leave it for the library or anywhere else. That is exactly
// what a reader means by "this session", with no timer, no storage key to expire, and nothing to
// clear by hand.
//
// TWO OTHER MECHANISMS WERE TRIED AND ARE WORSE, recorded so neither is reintroduced:
//
// - `location.state`, threaded through each navigation. It works, but the tally would then ride
//   in the one channel ruling H forbids for this flow's real inputs, and AddBook's and AddVideo's
//   probes assert `state:none` on the hop to results precisely to catch a `location.state`
//   forward sitting on top of an already-correct query. Loosening those to "state contains no
//   collectionId" would have removed the only assertion that catches a wholesale state forward —
//   weakening a demonstrated guard to make room for a decoration.
// - `sessionStorage`. It survives too much: a reader returning to the same tab an hour later
//   would be told nine items were filed "this session".
export const FilingSessionProvider = () => {
  const [filedCount, setFiledCount] = useState(0);

  const recordFiled = useCallback(() => setFiledCount((n) => n + 1), []);

  const value = useMemo(() => ({ filedCount, recordFiled }), [filedCount, recordFiled]);

  return (
    <FilingSessionContext.Provider value={value}>
      <Outlet />
    </FilingSessionContext.Provider>
  );
};

// Returns a zero/no-op session when no provider is above — deliberately, rather than throwing the
// way `useToast` does. The four flow screens are also rendered directly by their own unit tests,
// which mount one route at a time with no layout above it; making the hook throw would force
// every one of those to grow a provider to test something they are not testing. The wiring itself
// is asserted where it can actually be observed: `filingSessionRoutes.test.jsx` checks the provider wraps the
// add routes, and `check:browser` watches the tally rise across a real save.
const EMPTY_SESSION = { filedCount: 0, recordFiled: () => {} };

export const useFilingSession = () => useContext(FilingSessionContext) ?? EMPTY_SESSION;
