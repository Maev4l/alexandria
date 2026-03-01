// Edited by Claude.
// Item history page - displays lending/return events for an item
// Includes clear history functionality with confirmation
import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, History, Trash2, AlertTriangle } from 'lucide-react';
import { AppBar } from '@/navigation';
import { useItemData } from '@/hooks';
import { librariesApi } from '@/api';
import { useToast } from '@/components/Toast';
import PullToRefresh from '@/components/PullToRefresh';
import { Timeline } from '@/components/ui/Timeline';
import { cn } from '@/lib/utils';

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

  // Clear confirmation state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadMoreRef = useRef(null);

  // Handle clear history
  const handleClearHistory = useCallback(async () => {
    if (!libraryId || !itemId || isClearing) return;

    setIsClearing(true);
    try {
      await librariesApi.deleteItemEvents(libraryId, itemId);
      setEvents([]);
      setNextToken(null);
      setShowClearConfirm(false);
    } catch (err) {
      // Close sheet first, then show error toast
      setShowClearConfirm(false);
      setIsClearing(false);
      toast.error(err.message || 'Failed to clear history');
      return;
    }
    setIsClearing(false);
  }, [libraryId, itemId, isClearing, toast]);

  // Check if item is currently lent
  const isLent = !!item?.lentTo;

  // Show clear button when there are events and item is not lent
  const showClearButton = events.length > 0 && !isLent;

  // Render AppBar
  const renderAppBar = () => (
    <AppBar
      title="History"
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

  // Fetch events
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

  // Load more events
  const loadMore = useCallback(async () => {
    if (!libraryId || !itemId || !nextToken || isLoading) return;

    setIsLoading(true);
    try {
      const data = await librariesApi.getItemEvents(libraryId, itemId, {
        limit: 20,
        nextToken,
      });
      setEvents((prev) => [...prev, ...(data.events || [])]);
      setNextToken(data.nextToken || null);
    } catch {
      // Silent fail for load more
    } finally {
      setIsLoading(false);
    }
  }, [libraryId, itemId, nextToken, isLoading]);

  // Initial fetch
  useEffect(() => {
    if (!hasLoaded) {
      fetchEvents();
    }
  }, [hasLoaded, fetchEvents]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextToken && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [nextToken, isLoading, loadMore]);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setHasLoaded(false);
    await fetchEvents(true);
  }, [fetchEvents]);

  // Prevent body scroll when confirmation is open
  useEffect(() => {
    if (showClearConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showClearConfirm]);

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

  // Empty state
  if (events.length === 0) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {renderAppBar()}
        <div className="flex-1 min-h-0 relative">
          <PullToRefresh onRefresh={handleRefresh}>
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
              <History className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-lg font-medium">No history yet</p>
              <p className="text-sm text-muted-foreground">
                Lending and return events will appear here.
              </p>
            </div>
          </PullToRefresh>
        </div>
      </div>
    );
  }

  // Events timeline
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {renderAppBar()}
      <div className="flex-1 min-h-0 relative">
        <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4">
          <Timeline>
            {events.map((event, index) => {
              const isLentEvent = event.type === 'LENT';
              const isLast = index === events.length - 1;

              return (
                <Timeline.Item
                  key={`${event.date}-${index}`}
                  dotColor={isLentEvent ? 'orange' : 'green'}
                  isLast={isLast}
                >
                  <p className="text-xs text-muted-foreground">
                    {formatDate(event.date)}
                  </p>
                  <p className="font-medium">
                    {isLentEvent ? 'Lent to' : 'Returned from'}{' '}
                    <span className={isLentEvent ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}>
                      {event.event}
                    </span>
                  </p>
                </Timeline.Item>
              );
            })}
          </Timeline>

          {/* Load more trigger */}
          <div ref={loadMoreRef} className="h-4" />

          {/* Loading more indicator */}
          {isLoading && events.length > 0 && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        </PullToRefresh>
      </div>

      {/* Clear confirmation sheet */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isClearing && setShowClearConfirm(false)}
          />

          {/* Confirmation sheet */}
          <div className="relative bg-background rounded-t-xl">
            {/* Warning content */}
            <div className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Clear History?</h3>
                <p className="text-sm text-muted-foreground">
                  This will permanently delete all lending history for this item. This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="p-4 pt-0 space-y-2">
              <button
                onClick={handleClearHistory}
                disabled={isClearing}
                className={cn(
                  'w-full py-3 rounded-lg bg-destructive text-destructive-foreground font-medium',
                  'hover:bg-destructive/90 transition-colors disabled:opacity-50',
                  'flex items-center justify-center gap-2'
                )}
              >
                {isClearing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  'Clear History'
                )}
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="w-full py-3 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemHistory;
