// Edited by Claude.
// Library detail page - shows list of books with infinite scroll
// Groups items by collection, sorted alphabetically
// Uses LibrariesContext for state management
import { useEffect, useCallback, useRef, useMemo } from 'react';
import { Loader2, BookOpen, AlertCircle, Plus } from 'lucide-react';
import { useNavigation } from '@/navigation';
import { useLibraries } from '@/state';
import PullToRefresh from '@/components/PullToRefresh';
import BookCard from '@/components/BookCard';
import CollectionCard from '@/components/CollectionCard';
import ItemActionsSheet from '@/components/ItemActionsSheet';
import { useToast } from '@/components/Toast';
import { useState } from 'react';

// Build unified sorted list: standalone items + collections, alphabetically
const buildSortedList = (items) => {
  const collections = {};
  const standalone = [];

  items.forEach((item) => {
    if (item.collection) {
      if (!collections[item.collection]) {
        collections[item.collection] = [];
      }
      collections[item.collection].push(item);
    } else {
      standalone.push({ type: 'item', data: item, sortKey: item.title?.toLowerCase() || '' });
    }
  });

  // Convert collections to list entries, sort items by order within each
  const collectionEntries = Object.entries(collections).map(([name, collectionItems]) => ({
    type: 'collection',
    name,
    items: collectionItems.sort((a, b) => (a.order || 0) - (b.order || 0)),
    sortKey: name.toLowerCase(),
  }));

  // Merge and sort alphabetically by sortKey
  return [...standalone, ...collectionEntries]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
};

const LibraryContent = () => {
  const { setOptions, params, registerScrollToTop, navigate } = useNavigation();
  const library = params?.library;

  // Get items state and actions from context
  const { itemsByLibrary, fetchItems, loadMoreItems, deleteItem, lendItem, returnItem } = useLibraries();
  const toast = useToast();
  const itemsState = itemsByLibrary[library?.id];
  const items = itemsState?.items || [];
  const nextToken = itemsState?.nextToken || null;
  const isLoading = itemsState?.isLoading || false;
  const error = itemsState?.error || null;
  const hasLoaded = !!itemsState; // Track if we've ever fetched this library

  // Local UI state for actions sheet
  const [selectedItem, setSelectedItem] = useState(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadMoreRef = useRef(null);
  const pullToRefreshRef = useRef(null);
  const fetchingLibraryRef = useRef(null); // Track which library is being fetched

  // Register scroll-to-top handler for AppBar title tap
  useEffect(() => {
    const unregister = registerScrollToTop(() => {
      pullToRefreshRef.current?.scrollToTop();
    });
    return unregister;
  }, [registerScrollToTop]);

  // Build sorted list with collections grouped
  const sortedList = useMemo(() => buildSortedList(items), [items]);

  // Check if library is shared (read-only, no add button)
  const isSharedLibrary = !!library?.sharedFrom;

  // Set up header with library name, optional subtitle for shared libraries, and add button (if owned)
  useEffect(() => {
    const options = {
      title: library?.name || 'Library',
      // Explicitly set headerRight to ensure we override any stale value from previous screens
      headerRight: null,
      subtitle: null,
    };

    // Show who shared the library as subtitle (read-only, no add button)
    if (isSharedLibrary) {
      options.subtitle = `Shared by ${library.sharedFrom}`;
    } else {
      // Only show add button for owned libraries
      options.headerRight = (
        <button
          onClick={() => navigate('addBook', { push: true, params: { library } })}
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-accent"
          aria-label="Add book"
        >
          <Plus className="h-5 w-5" />
        </button>
      );
    }

    setOptions(options);
  }, [setOptions, library, navigate, isSharedLibrary]);

  // Reset fetch guard when items are invalidated (e.g., after creating/deleting a book)
  // This allows refetching when the screen becomes visible again
  useEffect(() => {
    if (!itemsState) {
      fetchingLibraryRef.current = null;
    }
  }, [itemsState]);

  // Fetch items on mount if not already loaded for this library
  // - hasLoaded: prevents refetch when returning to cached screen
  // - fetchingLibraryRef: guards against React Strict Mode double-call
  useEffect(() => {
    const libraryId = library?.id;
    if (libraryId && !hasLoaded && fetchingLibraryRef.current !== libraryId) {
      fetchingLibraryRef.current = libraryId;
      fetchItems(libraryId, true);
    }
  }, [library?.id, hasLoaded, fetchItems]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextToken && !isLoading) {
          loadMoreItems(library.id);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [nextToken, isLoading, loadMoreItems, library?.id]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    if (library?.id) {
      await fetchItems(library.id, true);
    }
  }, [library?.id, fetchItems]);

  // Long press on item -> show actions sheet
  const handleItemLongPress = useCallback((item) => {
    setSelectedItem(item);
    setIsActionsOpen(true);
  }, []);

  // Close actions sheet
  const handleCloseActions = useCallback(() => {
    setIsActionsOpen(false);
    setSelectedItem(null);
    setIsActionLoading(false);
  }, []);

  // Handle action from sheet
  // data parameter contains extra info like { personName } for lend action
  const handleAction = useCallback(async (action, item, data) => {
    switch (action) {
      case 'edit':
        handleCloseActions();
        navigate('editBook', { push: true, params: { library, book: item } });
        break;
      case 'lend':
        setIsActionLoading(true);
        try {
          await lendItem(library.id, item.id, data.personName);
          handleCloseActions();
        } catch (err) {
          toast.error(err.message || 'Failed to lend item');
          setIsActionLoading(false);
        }
        break;
      case 'return':
        setIsActionLoading(true);
        try {
          await returnItem(library.id, item.id, item.lentTo);
          handleCloseActions();
        } catch (err) {
          toast.error(err.message || 'Failed to return item');
          setIsActionLoading(false);
        }
        break;
      case 'delete':
        setIsActionLoading(true);
        try {
          await deleteItem(library.id, item.id);
          handleCloseActions();
        } catch (err) {
          toast.error(err.message || 'Failed to delete item');
          setIsActionLoading(false);
        }
        break;
      default:
        break;
    }
  }, [library, navigate, deleteItem, lendItem, returnItem, toast, handleCloseActions]);

  if (!library) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-muted-foreground">Library not found</p>
      </div>
    );
  }

  // Initial loading state
  if (isLoading && items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state (no data)
  if (error && items.length === 0) {
    return (
      <PullToRefresh onRefresh={handleRefresh} className="h-full">
        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground">Pull down to retry</p>
        </div>
      </PullToRefresh>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <PullToRefresh onRefresh={handleRefresh} className="h-full">
        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">No books yet</p>
          <p className="text-sm text-muted-foreground">
            {isSharedLibrary
              ? 'This library is empty.'
              : 'Add books to this library to see them here.'}
          </p>
        </div>
      </PullToRefresh>
    );
  }

  // Items list (unified: standalone + collections, alphabetically sorted)
  return (
    <>
      <PullToRefresh
        ref={pullToRefreshRef}
        onRefresh={handleRefresh}
        className="h-full"
      >
        <div className="p-4 space-y-2">
          {sortedList.map((entry) => {
            if (entry.type === 'collection') {
              return (
                <CollectionCard
                  key={`collection-${entry.name}`}
                  name={entry.name}
                  items={entry.items}
                  onItemClick={(book) => {
                    navigate('bookDetail', { push: true, params: { library, book } });
                  }}
                  onItemLongPress={isSharedLibrary ? undefined : handleItemLongPress}
                  isSharedLibrary={isSharedLibrary}
                />
              );
            }
            return (
              <BookCard
                key={entry.data.id}
                book={entry.data}
                onClick={(book) => {
                  navigate('bookDetail', { push: true, params: { library, book } });
                }}
                onLongPress={isSharedLibrary ? undefined : handleItemLongPress}
                isSharedLibrary={isSharedLibrary}
              />
            );
          })}

          {/* Load more trigger */}
          <div ref={loadMoreRef} className="h-4" />

          {/* Loading more indicator */}
          {isLoading && items.length > 0 && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Item actions sheet */}
      <ItemActionsSheet
        item={selectedItem}
        isOpen={isActionsOpen}
        onClose={handleCloseActions}
        onAction={handleAction}
        isLoading={isActionLoading}
      />
    </>
  );
};

export default LibraryContent;
