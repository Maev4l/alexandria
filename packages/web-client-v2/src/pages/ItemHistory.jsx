// Edited by Claude.
// Item history page — "The Date-Due Card": an item's lending history rendered as
// the manila checkout card from the back of a library book, in cream + walnut.
// LENT/RETURNED events are paired client-side into one loan per row.
import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Trash2, AlertTriangle, Book, Film } from 'lucide-react';
import { AppBar } from '@/navigation';
import { useItemData } from '@/hooks';
import { librariesApi } from '@/api';
import { useToast } from '@/components/Toast';
import PullToRefresh from '@/components/PullToRefresh';
import BottomSheet from '@/components/BottomSheet';
import FadeImage from '@/components/FadeImage';
import { cn } from '@/lib/utils';

const ITEM_TYPE_VIDEO = 1;
const DAY = 86400000;

// Big "stamp" parts for the date gutter: MAR / 4 / '25
const stamp = (s) => {
  const d = new Date(s);
  return {
    mon: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: d.getDate(),
    yy: `'${String(d.getFullYear()).slice(2)}`,
  };
};
// Compact inline date: "4 Mar"
const fmtShort = (s) => new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const daysBetween = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / DAY));
const daysSinceNow = (a) => Math.max(0, Math.floor((Date.now() - new Date(a)) / DAY));

// Fold newest-first events into loans. Robust to malformed/partial data and to
// pairs split across pagination boundaries (re-run over the full list as pages append).
// Never drops an event — unpairable events render as standalone half-rows.
const groupLoans = (events) => {
  const loans = [];
  let pendingReturn = null; // a RETURNED awaiting its (chronologically earlier) LENT
  events.forEach((ev, i) => {
    if (ev.type === 'RETURNED') {
      if (pendingReturn) {
        loans.push({ kind: 'return-only', date: pendingReturn.date, borrower: pendingReturn.event });
      }
      pendingReturn = ev;
    } else {
      // LENT
      if (pendingReturn) {
        loans.push({ kind: 'closed', outDate: ev.date, backDate: pendingReturn.date, borrower: ev.event });
        pendingReturn = null;
      } else if (i === 0) {
        loans.push({ kind: 'open', outDate: ev.date, borrower: ev.event });
      } else {
        loans.push({ kind: 'lent-only', outDate: ev.date, borrower: ev.event });
      }
    }
  });
  if (pendingReturn) {
    loans.push({ kind: 'return-only', date: pendingReturn.date, borrower: pendingReturn.event });
  }
  return loans;
};

// A single stamped loan row.
const LoanRow = ({ loan, index }) => {
  const gutterDate = loan.kind === 'return-only' ? loan.date : loan.outDate;
  const { mon, day, yy } = stamp(gutterDate);
  const isOpen = loan.kind === 'open';

  let meta;
  let pill = null;
  if (loan.kind === 'closed') {
    meta = `lent ${fmtShort(loan.outDate)} · back ${fmtShort(loan.backDate)}`;
    const d = daysBetween(loan.outDate, loan.backDate);
    pill = (
      <span className="shrink-0 rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] font-semibold text-secondary">
        {d} {d === 1 ? 'day' : 'days'}
      </span>
    );
  } else if (loan.kind === 'open') {
    const d = daysSinceNow(loan.outDate);
    meta = d === 0 ? 'lent today' : `lent ${fmtShort(loan.outDate)} · ${d} ${d === 1 ? 'day' : 'days'} and counting`;
    pill = (
      <span className="lent-slip shrink-0 text-[10px]">
        <span className="ephemera-caps">Lent</span>
        <span className="lent-slip__div" />
        <span className="font-serif italic text-[12px] leading-none">{d} {d === 1 ? 'day' : 'days'}</span>
      </span>
    );
  } else if (loan.kind === 'lent-only') {
    meta = `lent ${fmtShort(loan.outDate)}`;
  } else {
    meta = `returned ${fmtShort(loan.date)}`;
  }

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 px-4 py-3 border-t border-border animate-fade-in-up',
        isOpen && 'pl-[14px]'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Active-loan amber accent */}
      {isOpen && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--lent)]" />}

      {/* Date gutter (the stamp) */}
      <div className="w-11 shrink-0 text-center">
        <p className="font-sans text-sm font-bold uppercase leading-none text-foreground">{mon}</p>
        <p className="mt-0.5 font-serif text-xs text-muted-foreground">{day} {yy}</p>
      </div>

      {/* Column rule */}
      <div className="self-stretch w-px bg-border" />

      {/* Borrower field */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-sans text-[15px] font-semibold text-foreground">{loan.borrower}</p>
          {pill}
        </div>
        <p className="truncate font-serif italic text-sm text-muted-foreground">{meta}</p>
      </div>
    </div>
  );
};

const ItemHistory = () => {
  const { libraryId, itemId } = useParams();
  const { item, library } = useItemData(libraryId, itemId);
  const toast = useToast();

  const [events, setEvents] = useState([]);
  const [nextToken, setNextToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadMoreRef = useRef(null);

  const loans = useMemo(() => groupLoans(events), [events]);

  const isLent = !!item?.lentTo;
  const showClearButton = events.length > 0 && !isLent;

  // Item identity for the masthead
  const isVideo = item?.type === ITEM_TYPE_VIDEO;
  const cloudFrontUrl = item?.picture
    ? `${item.picture}?v=${item.updatedAt ? new Date(item.updatedAt).getTime() : '0'}`
    : null;
  const subtitle = isVideo
    ? (item?.directors?.length ? `dir. ${item.directors[0]}` : '')
    : (item?.authors?.join(', ') || '');

  const handleClearHistory = useCallback(async () => {
    if (!libraryId || !itemId || isClearing) return;
    setIsClearing(true);
    try {
      await librariesApi.deleteItemEvents(libraryId, itemId);
      setEvents([]);
      setNextToken(null);
      setShowClearConfirm(false);
    } catch (err) {
      setShowClearConfirm(false);
      setIsClearing(false);
      toast.error(err.message || 'Failed to clear history');
      return;
    }
    setIsClearing(false);
  }, [libraryId, itemId, isClearing, toast]);

  const renderAppBar = () => (
    <AppBar
      title={item?.title || 'History'}
      headerRight={
        showClearButton ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-accent"
            aria-label="Clear history"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        ) : undefined
      }
    />
  );

  const fetchEvents = useCallback(async () => {
    if (!libraryId || !itemId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await librariesApi.getItemEvents(libraryId, itemId, { limit: 20 });
      setEvents(data.events || []);
      setNextToken(data.nextToken || null);
      setHasLoaded(true);
    } catch (err) {
      setError(err.message || 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, [libraryId, itemId]);

  const loadMore = useCallback(async () => {
    if (!libraryId || !itemId || !nextToken || isLoading) return;
    setIsLoading(true);
    try {
      const data = await librariesApi.getItemEvents(libraryId, itemId, { limit: 20, nextToken });
      setEvents((prev) => [...prev, ...(data.events || [])]);
      setNextToken(data.nextToken || null);
    } catch {
      // Silent fail for load more
    } finally {
      setIsLoading(false);
    }
  }, [libraryId, itemId, nextToken, isLoading]);

  useEffect(() => {
    if (!hasLoaded) fetchEvents();
  }, [hasLoaded, fetchEvents]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextToken && !isLoading) loadMore();
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [nextToken, isLoading, loadMore]);

  const handleRefresh = useCallback(async () => {
    setHasLoaded(false);
    await fetchEvents(true);
  }, [fetchEvents]);

  // The masthead: the printed top of the checkout card (cover + identity).
  const renderMasthead = () => (
    <>
      {/* Double top rule */}
      <div className="h-0.5 bg-[var(--wood-d)]" />
      <div className="mt-[3px] h-px bg-[var(--wood-d)]/50" />
      <div className="flex items-end gap-3 px-4 pt-3 pb-3">
        <div className="w-12 h-[68px] shrink-0 overflow-hidden rounded-[4px_4px_2px_2px] bg-muted flex items-center justify-center shadow-[var(--shelf-shadow)]">
          {cloudFrontUrl ? (
            <FadeImage
              src={cloudFrontUrl}
              alt={item.title}
              className="w-full h-full object-cover"
              fallback={isVideo ? <Film className="h-5 w-5 text-muted-foreground/50" /> : <Book className="h-5 w-5 text-muted-foreground/50" />}
            />
          ) : isVideo ? (
            <Film className="h-5 w-5 text-muted-foreground/50" />
          ) : (
            <Book className="h-5 w-5 text-muted-foreground/50" />
          )}
        </div>
        <div className="min-w-0 flex-1 pb-0.5">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--wood-d)]">
            Checkout card
          </p>
          <p className="truncate font-sans text-base font-bold text-foreground">{item.title}</p>
          {subtitle && <p className="truncate font-serif italic text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {/* The walnut shelf the cover stands on / divider into the ruled body */}
      <div className="shelf-ledge h-1.5 w-full" />
    </>
  );

  if (!library || !item) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {renderAppBar()}
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground">Item not found</p>
        </div>
      </div>
    );
  }

  // Initial loading
  if (isLoading && events.length === 0) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {renderAppBar()}
        <div className="flex flex-1 items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && events.length === 0) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {renderAppBar()}
        <div className="flex-1 min-h-0 relative">
          <PullToRefresh onRefresh={handleRefresh}>
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              <p className="text-xs text-muted-foreground">Pull down to retry</p>
            </div>
          </PullToRefresh>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {renderAppBar()}
      <div className="flex-1 min-h-0 relative">
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="p-4">
            <div className="overflow-hidden rounded-2xl bg-card shadow-[var(--card-shadow)]">
              {renderMasthead()}

              {events.length === 0 ? (
                // Empty state: a blank, unstamped card
                <div className="relative">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-stretch gap-3 px-4 py-3 border-t border-border">
                      <div className="w-11 shrink-0" />
                      <div className="w-px bg-border" />
                      <div className="flex-1" />
                    </div>
                  ))}
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                    <p className="font-serif italic text-[15px] text-muted-foreground">No one has borrowed this yet.</p>
                    <p className="mt-1 font-sans text-xs text-muted-foreground/80">Lend it from the item&apos;s actions.</p>
                  </div>
                </div>
              ) : (
                loans.map((loan, index) => (
                  <LoanRow key={`${loan.kind}-${loan.outDate || loan.date}-${index}`} loan={loan} index={index} />
                ))
              )}
            </div>

            {/* Load more trigger */}
            <div ref={loadMoreRef} className="h-4" />

            {/* Loading more — house voice */}
            {isLoading && events.length > 0 && (
              <p className="py-4 text-center font-serif italic text-[13px] text-muted-foreground">
                turning the card over…
              </p>
            )}
          </div>
        </PullToRefresh>
      </div>

      {/* Clear confirmation — cream BottomSheet */}
      <BottomSheet
        isOpen={showClearConfirm}
        onClose={() => !isClearing && setShowClearConfirm(false)}
        title="Clear this card?"
      >
        <div className="space-y-5 text-center">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <p className="font-serif text-[15px] leading-relaxed text-muted-foreground">
            This removes every stamped loan. It can&apos;t be undone.
          </p>
          <div className="space-y-2 pt-1">
            <button
              onClick={handleClearHistory}
              disabled={isClearing}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl bg-destructive py-3 font-medium text-destructive-foreground',
                'transition-colors hover:bg-destructive/90 disabled:opacity-50'
              )}
            >
              {isClearing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Clearing…
                </>
              ) : (
                'Clear history'
              )}
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              disabled={isClearing}
              className="w-full rounded-xl bg-muted py-3 font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

export default ItemHistory;
