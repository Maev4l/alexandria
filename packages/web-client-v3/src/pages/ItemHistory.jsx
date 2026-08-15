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
  const { canAct } = useLibraries();
  // Same gate item detail uses: absence of knowledge is not permission, so clearing stays
  // absent until the library is positively known to be owned, not merely "not yet shared".
  const isReadOnly = !canAct(libraryId);
  const { confirm } = useToast();

  const [item, setItem] = useState(null);
  const [events, setEvents] = useState([]);
  const [nextToken, setNextToken] = useState(null);
  const [status, setStatus] = useState('loading');
  const [isAppending, setIsAppending] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [fetchedItem, page] = await Promise.all([
        itemsApi.get(libraryId, itemId),
        eventsApi.list(libraryId, itemId, { limit: PAGE_LIMIT }),
      ]);
      setItem(fetchedItem);
      setEvents(page?.events ?? []);
      setNextToken(page?.nextToken ?? null);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [libraryId, itemId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    setIsAppending(true);
    try {
      const page = await eventsApi.list(libraryId, itemId, { limit: PAGE_LIMIT, nextToken });
      // A loan can straddle a page boundary, so pairing needs the WHOLE history at once: pages
      // accumulate raw events here and are re-paired below on every render, rather than each
      // page being paired in isolation and the two halves of one loan never meeting.
      setEvents((current) => [...current, ...(page?.events ?? [])]);
      setNextToken(page?.nextToken ?? null);
    } catch {
      // nextToken is left untouched, so the same button can be pressed again.
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

        {status === 'error' && (
          // Recovery is a control, never an instruction to perform a gesture.
          <div role="alert" className="border-t-2 border-out bg-paper-deep p-4">
            <p className="text-sm">Could not load this item&apos;s history. Check your connection.</p>
            <PlateButton variant="secondary" className="mt-4" onClick={load}>
              Try again
            </PlateButton>
          </div>
        )}

        {status === 'ready' && (
          <>
            {loans.length === 0 ? (
              // The empty state is a ruled frame at the same weight as a full block, not a
              // bare sentence — the same treatment LibraryBrowse gives its empty stream.
              <div className="border-2 border-ink p-8 text-center">
                <p className="caps text-xs font-bold text-ink-soft">Never lent</p>
              </div>
            ) : (
              <div className="border-[3px] border-ink">
                {loans.map((loan) => (
                  <LedgerRow key={`${loan.lentAt}-${loan.name}`} loan={loan} />
                ))}
              </div>
            )}

            {nextToken && (
              <PlateButton
                variant="secondary"
                className="mt-4"
                disabled={isAppending}
                onClick={loadMore}
              >
                {isAppending ? 'Loading' : 'Load more'}
              </PlateButton>
            )}

            {/* Read-only means absent, not disabled — the same rule item detail's actions
                follow — and there is nothing to clear on an empty record either way. */}
            {!isReadOnly && loans.length > 0 && (
              <div className="mt-8">
                <PlateButton variant="danger" onClick={() => setIsConfirmingClear(true)}>
                  Clear the record
                </PlateButton>
              </div>
            )}
          </>
        )}
      </main>

      <Sheet
        open={isConfirmingClear}
        onClose={() => setIsConfirmingClear(false)}
        title="Clear the record?"
      >
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
