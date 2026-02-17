// Edited by Claude.
// Item history page - displays lending/return events for a book
import { useEffect, useCallback, useState, useRef } from 'react';
import { Loader2, History } from 'lucide-react';
import { useNavigation } from '@/navigation';
import { librariesApi } from '@/api';
import PullToRefresh from '@/components/PullToRefresh';
import { Timeline } from '@/components/ui/Timeline';

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
  const { setOptions, params } = useNavigation();
  const library = params?.library;
  const book = params?.book;

  const [events, setEvents] = useState([]);
  const [nextToken, setNextToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadMoreRef = useRef(null);
  const fetchingRef = useRef(false);

  // Set up header
  useEffect(() => {
    setOptions({
      title: 'History',
      headerRight: null,
    });
  }, [setOptions]);

  // Fetch events
  const fetchEvents = useCallback(async (refresh = false) => {
    if (!library?.id || !book?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await librariesApi.getItemEvents(library.id, book.id, { limit: 20 });
      setEvents(data.events || []);
      setNextToken(data.nextToken || null);
      setHasLoaded(true);
    } catch (err) {
      setError(err.message || 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, [library?.id, book?.id]);

  // Load more events
  const loadMore = useCallback(async () => {
    if (!library?.id || !book?.id || !nextToken || isLoading) return;

    setIsLoading(true);
    try {
      const data = await librariesApi.getItemEvents(library.id, book.id, {
        limit: 20,
        nextToken,
      });
      setEvents((prev) => [...prev, ...(data.events || [])]);
      setNextToken(data.nextToken || null);
    } catch (err) {
      // Silent fail for load more
    } finally {
      setIsLoading(false);
    }
  }, [library?.id, book?.id, nextToken, isLoading]);

  // Initial fetch
  useEffect(() => {
    if (!hasLoaded && !fetchingRef.current) {
      fetchingRef.current = true;
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
    fetchingRef.current = false;
    setHasLoaded(false);
    await fetchEvents(true);
  }, [fetchEvents]);

  if (!library || !book) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-muted-foreground">Book not found</p>
      </div>
    );
  }

  // Initial loading
  if (isLoading && events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error && events.length === 0) {
    return (
      <PullToRefresh onRefresh={handleRefresh} className="h-full">
        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground">Pull down to retry</p>
        </div>
      </PullToRefresh>
    );
  }

  // Empty state
  if (events.length === 0) {
    return (
      <PullToRefresh onRefresh={handleRefresh} className="h-full">
        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
          <History className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">No history yet</p>
          <p className="text-sm text-muted-foreground">
            Lending and return events will appear here.
          </p>
        </div>
      </PullToRefresh>
    );
  }

  // Events timeline
  return (
    <PullToRefresh onRefresh={handleRefresh} className="h-full">
      <div className="p-4">
        <Timeline>
          {events.map((event, index) => {
            const isLent = event.type === 'LENT';
            const isLast = index === events.length - 1;

            return (
              <Timeline.Item
                key={`${event.date}-${index}`}
                dotColor={isLent ? 'orange' : 'green'}
                isLast={isLast}
              >
                <p className="text-xs text-muted-foreground">
                  {formatDate(event.date)}
                </p>
                <p className="font-medium">
                  {isLent ? 'Lent to' : 'Returned from'}{' '}
                  <span className={isLent ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}>
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
  );
};

export default ItemHistory;
