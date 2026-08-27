import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import LedgerRow from '@/components/imprint/LedgerRow.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import Sheet from '@/components/imprint/Sheet.jsx';
import { eventsApi, itemsApi } from '@/api';
import { pairLoanEvents } from '@/lib/loans';
import { useLibraries } from '@/state/LibrariesContext.jsx';
import { useToast } from '@/state/ToastContext.jsx';

// The API caps a page at 50. This screen is read end-to-end rather than scanned like the
// item stream, so it takes the largest page the API allows and offers an explicit "Load more"
// button for the rest, rather than the stream's invisible infinite scroll.
const PAGE_LIMIT = 50;

// On the paper ground, not the cover — the black-cover inversion belongs to item detail alone,
// where the reader is looking at one object. Here the reader is reading a RECORD.
const ItemHistory = () => {
  const { libraryId, itemId } = useParams();
  const navigate = useNavigate();
  const { canAct, byId, error: librariesError, refresh: refreshLibraries } = useLibraries();
  // Same gate item detail uses: absence of knowledge is not permission, so clearing stays
  // absent until the library is positively known to be owned, not merely "not yet shared".
  const isReadOnly = !canAct(libraryId);
  const library = byId(libraryId);
  const { confirm } = useToast();

  const [item, setItem] = useState(null);
  const [events, setEvents] = useState([]);
  const [nextToken, setNextToken] = useState(null);
  const [status, setStatus] = useState('loading');
  const [isAppending, setIsAppending] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState(null);

  // `isCancelled` defaults to "never" for the "Try again" button's manual retry, which always
  // targets whatever item is currently on screen. The mount effect below passes a real guard:
  // React Router keeps this element mounted across a `:itemId` change, so a slow fetch for the
  // item that just left the URL could otherwise resolve after a fast one for the item that
  // replaced it and paint the wrong item's history — the same race ItemDetail guards against.
  const load = useCallback(
    async (isCancelled = () => false) => {
      setStatus('loading');
      try {
        const [fetchedItem, page] = await Promise.all([
          itemsApi.get(libraryId, itemId),
          eventsApi.list(libraryId, itemId, { limit: PAGE_LIMIT }),
        ]);
        if (isCancelled()) return;
        setItem(fetchedItem);
        setEvents(page?.events ?? []);
        setNextToken(page?.nextToken ?? null);
        setStatus('ready');
      } catch {
        if (isCancelled()) return;
        setStatus('error');
      }
    },
    [libraryId, itemId],
  );

  useEffect(() => {
    let cancelled = false;
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const loadMore = async () => {
    setLoadMoreError(null);
    setIsAppending(true);
    try {
      const page = await eventsApi.list(libraryId, itemId, { limit: PAGE_LIMIT, nextToken });
      // A loan can straddle a page boundary, so pairing needs the WHOLE history at once: pages
      // accumulate raw events here and are re-paired below on every render, rather than each
      // page being paired in isolation and the two halves of one loan never meeting.
      setEvents((current) => [...current, ...(page?.events ?? [])]);
      setNextToken(page?.nextToken ?? null);
    } catch (err) {
      // Inline, in place, next to the control that can retry — the same precedent
      // StreamContext/LibraryBrowse follow for a failed page fetch. nextToken is left
      // untouched, so the SAME page is retried rather than the reader losing their place or a
      // click that visibly did nothing (the defect: isAppending alone reverting the button's
      // label was indistinguishable from a click that never registered).
      setLoadMoreError(err.message);
    } finally {
      setIsAppending(false);
    }
  };

  const clearHistory = async () => {
    setClearError(null);
    setIsClearing(true);
    try {
      await eventsApi.clear(libraryId, itemId);
      confirm('History cleared');
      navigate(`/libraries/${libraryId}/items/${itemId}`);
    } catch (err) {
      // Stays open: the reader already committed once, and dropping back to the single "Clear
      // the record" button would make them confirm twice for one failed attempt — the same
      // choice item detail's delete makes.
      setClearError(err.message);
      setIsClearing(false);
    }
  };

  const loans = pairLoanEvents(events);
  const title = item?.title ?? '';

  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader title={title} onBack={() => navigate(-1)} search={false} />
      <main className="p-4" aria-busy={status === 'loading'}>
        {/* The header already carries the item's title once loaded; this restates it for
            assistive tech only, and names the screen even before that fetch resolves. */}
        <h1 className="sr-only">{title ? `${title} — full record` : 'Item history'}</h1>

        {/* Read-only can mean three different things: not mine, not loaded yet, or the
            /libraries fetch failed. Silently hiding "Clear the record" for the third reason
            leaves the owner no way to tell a real restriction from a dropped request — the
            same gap ItemDetail's action row had, and the same block LibraryBrowse already
            shows for it. */}
        {isReadOnly && librariesError && !library && (
          <div role="alert" className="mb-4 border-t-2 border-out bg-paper-deep p-4 text-ink">
            <p className="text-sm">
              Could not check whether this library is yours, so its actions are hidden.
            </p>
            <PlateButton variant="secondary" className="mt-4" onClick={refreshLibraries}>
              Try again
            </PlateButton>
          </div>
        )}

        {status === 'error' && (
          // Recovery is a control, never an instruction to perform a gesture.
          <div role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-ink">
            <p className="text-sm">Could not load this item&apos;s history. Check your connection.</p>
            <PlateButton variant="secondary" className="mt-4" onClick={load}>
              Try again
            </PlateButton>
          </div>
        )}

        {status === 'loading' && (
          // Round 5 critique #7: this branch used to render nothing below the sr-only <h1> — a
          // blank screen on the two routes with the worst network conditions in the app. Ruled
          // skeleton frames at the correct ratio, shaped like the boxed ledger
          // card below (same border-[3px] card, same per-row border-b/px-4/py-2 LedgerRow
          // already uses) so the layout does not move once real rows replace these bars.
          <div aria-hidden="true" className="border-[3px] border-ink [&>*:last-child]:border-b-0">
            {[0, 1, 2].map((row) => (
              <div key={row} className="border-b border-ink px-4 py-2">
                <span className="flex justify-between gap-2">
                  <span className="block h-3 w-24 bg-paper-deep" />
                  <span className="block h-3 w-12 bg-paper-deep" />
                </span>
                <span className="mt-2 block h-3 w-40 bg-paper-deep" />
              </div>
            ))}
          </div>
        )}

        {status === 'ready' && (
          <>
            {events.length === 0 ? (
              // Genuinely nothing recorded. The empty state is a ruled frame at the same weight
              // as a full block, not a bare sentence — the same treatment LibraryBrowse gives
              // its empty stream.
              <div className="border-2 border-ink p-8 text-center">
                <p className="caps text-xs font-bold text-ink-soft">Never lent</p>
              </div>
            ) : loans.length === 0 ? (
              // Round 6 review's copy question: `pairLoanEvents` drops an orphaned RETURNED (one
              // with no LENT before it — src/lib/loans.js), so this item DOES have history, it
              // just does not form a loan. "Never lent" here would be false — something was
              // recorded — and silently falling through to the same block as genuinely-empty
              // would make that false statement anyway. Distinguished with its own heading
              // rather than a second condition on the same copy, per the labelled-twice rule
              // read the other way: two different facts must not share one sentence either.
              <div className="border-2 border-ink p-8 text-center">
                {/* Not "no loan on record" — the reader is under "THE RECORD" heading, looking
                    at events that exist, so "no record" would contradict the screen they are
                    standing on. What's absent is a completed PAIRING, not the record itself. */}
                <p className="caps text-xs font-bold text-ink-soft">No complete loan</p>
                <p className="mt-2 text-sm">
                  This item&apos;s history doesn&apos;t pair into a loan. You can still clear it
                  below.
                </p>
              </div>
            ) : (
              // `[&>*:last-child]:border-b-0` mirrors the comp's own
              // `.board-members .item:last-child { border-bottom: 0 }`: the last row's own 1px
              // hairline (LedgerRow's `border-b`) would otherwise sit flush on this card's 3px
              // bottom rule, compositing into a 4px edge the rule-weight scale does not contain.
              <div className="border-[3px] border-ink [&>*:last-child]:border-b-0">
                {/* boxed: this card's rows must not sit flush against its own rule (defect 2) —
                    unlike item detail's inline ledger, which is a flush text column. */}
                {loans.map((loan) => (
                  <LedgerRow key={`${loan.lentAt}-${loan.name}`} loan={loan} boxed />
                ))}
              </div>
            )}

            {nextToken && (
              <>
                {loadMoreError && (
                  // Recovery is a control, never an instruction to perform a gesture — the same
                  // rule the top-level load error above follows, and the same treatment
                  // LibraryBrowse gives a failed page fetch from useStream.
                  <p role="alert" className="mt-4 border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
                    {loadMoreError}
                  </p>
                )}
                <PlateButton
                  variant="secondary"
                  className="mt-4"
                  disabled={isAppending}
                  onClick={loadMore}
                >
                  {isAppending ? 'Loading' : loadMoreError ? 'Try again' : 'Load more'}
                </PlateButton>
              </>
            )}

            {/* Read-only means absent, not disabled — the same rule item detail's actions
                follow — and there is nothing to clear on an empty record either way. Gated on
                `events.length`, not `loans.length` (round 6 review): clearing deletes raw
                EVENTS (`DELETE .../events`), so an item with an orphaned RETURNED and zero
                paired loans still has something to clear — the "No complete loan" state above
                exists to say so and point here. */}
            {!isReadOnly && events.length > 0 && (
              <div className="mt-8">
                <PlateButton variant="danger" onClick={() => setIsConfirmingClear(true)}>
                  Clear the record
                </PlateButton>
              </div>
            )}
          </>
        )}
      </main>

      {/* The sheet's title is the content's own name, not a restatement of the action the body
          paragraph already spells out below it — the same rule every other content-scoped sheet
          in this package follows (ItemActionsSheet/LendSheet: item.title; LibraryActionsSheet:
          library.name; CollectionActionsSheet: board.title). "Clear the record?" atop "Clear the
          record for {title}?" was one fact stated twice. */}
      <Sheet open={isConfirmingClear} onClose={() => setIsConfirmingClear(false)} title={title}>
        {clearError && (
          <p role="alert" className="mb-4 border-t-2 border-out bg-paper p-4 text-sm text-ink">
            {clearError}
          </p>
        )}
        <p className="mb-4 text-sm">
          Clear the record for <strong>{title}</strong>? This deletes every lending event for
          this item, including who has it now. The item itself stays. This cannot be undone.
        </p>
        <div className="flex gap-2">
          <PlateButton variant="danger" disabled={isClearing} onClick={clearHistory}>
            {isClearing ? 'Clearing' : 'Clear for good'}
          </PlateButton>
          <PlateButton variant="secondary" onClick={() => setIsConfirmingClear(false)}>
            Keep it
          </PlateButton>
        </div>
      </Sheet>
    </div>
  );
};

export default ItemHistory;
