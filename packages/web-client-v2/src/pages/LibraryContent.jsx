// Edited by Claude.
// Library detail page - shows list of items (books + videos) with infinite scroll
// Groups items by collection, sorted alphabetically
// Uses LibrariesContext for state management
import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Plus } from 'lucide-react';
import EmptyBookshelf from '@/components/EmptyBookshelf';
import { AppBar } from '@/navigation';
import { useLibraries } from '@/state';
import { useLibraryData } from '@/hooks';
import PullToRefresh from '@/components/PullToRefresh';
import BookCard from '@/components/BookCard';
import VideoCard from '@/components/VideoCard';
import CollectionCard from '@/components/CollectionCard';
import ItemActionsSheet from '@/components/ItemActionsSheet';
import AddItemSheet from '@/components/AddItemSheet';
import CollectionActionsSheet from '@/components/CollectionActionsSheet';
import NewCollectionSheet from '@/components/NewCollectionSheet';
import { useToast } from '@/components/Toast';
import { librariesApi } from '@/api';

// Item type constants (matches backend domain.ItemType)
const ITEM_TYPE_BOOK = 0;
const ITEM_TYPE_VIDEO = 1;
const ITEM_TYPE_COLLECTION = 2;

// Build unified sorted list: standalone items + collections, alphabetically
// Handles both:
// - Collection items (type = 2) from API as empty/standalone collections
// - Regular items with collectionId as grouped collection members
const buildSortedList = (items) => {
  const collections = {};
  const standalone = [];

  items.forEach((item) => {
    // Collection items from API (type = 2) - create empty collection entry
    if (item.type === ITEM_TYPE_COLLECTION) {
      if (!collections[item.id]) {
        collections[item.id] = {
          id: item.id,
          name: item.title,
          items: [],
        };
      }
      return;
    }

    // Items with collectionId belong to a collection
    if (item.collectionId && item.collectionName) {
      if (!collections[item.collectionId]) {
        collections[item.collectionId] = {
          id: item.collectionId,
          name: item.collectionName,
          items: [],
        };
      }
      collections[item.collectionId].items.push(item);
    } else {
      standalone.push({ type: 'item', data: item, sortKey: item.title?.toLowerCase() || '' });
    }
  });

  // Convert collections to list entries, sort items by order within each
  const collectionEntries = Object.values(collections).map((col) => ({
    type: 'collection',
    collection: { id: col.id, name: col.name },
    items: col.items.sort((a, b) => (a.order || 0) - (b.order || 0)),
    sortKey: col.name.toLowerCase(),
  }));

  // Merge and sort alphabetically by sortKey
  return [...standalone, ...collectionEntries]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
};

const LibraryContent = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const { library, isSharedLibrary } = useLibraryData(libraryId);

  // Get items state and actions from context
  const { itemsByLibrary, fetchItems, loadMoreItems, deleteItem, lendItem, returnItem } = useLibraries();
  const toast = useToast();
  const itemsState = itemsByLibrary[libraryId];
  const items = itemsState?.items || [];
  const nextToken = itemsState?.nextToken || null;
  const isLoading = itemsState?.isLoading || false;
  const error = itemsState?.error || null;
  const hasLoaded = !!itemsState; // Track if we've ever fetched this library

  // Local UI state for actions sheet
  const [selectedItem, setSelectedItem] = useState(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // State for add item sheet
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [prefilledCollection, setPrefilledCollection] = useState(null);

  // State for collection actions sheet
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [isCollectionActionsOpen, setIsCollectionActionsOpen] = useState(false);

  // State for new collection sheet
  const [isNewCollectionOpen, setIsNewCollectionOpen] = useState(false);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  const loadMoreRef = useRef(null);
  const pullToRefreshRef = useRef(null);

  // Build sorted list with collections grouped
  const sortedList = useMemo(() => buildSortedList(items), [items]);

  // Scroll to top handler for AppBar title tap
  const handleScrollToTop = useCallback(() => {
    pullToRefreshRef.current?.scrollToTop();
  }, []);

  // Fetch items on mount if not already loaded for this library
  useEffect(() => {
    if (libraryId && !hasLoaded) {
      fetchItems(libraryId, true);
    }
  }, [libraryId, hasLoaded, fetchItems]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextToken && !isLoading) {
          loadMoreItems(libraryId);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [nextToken, isLoading, loadMoreItems, libraryId]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    if (libraryId) {
      await fetchItems(libraryId, true);
    }
  }, [libraryId, fetchItems]);

  // Long press on item -> show actions sheet
  const handleItemLongPress = useCallback((item) => {
    setSelectedItem(item);
    setIsActionsOpen(true);
  }, []);

  // Close actions sheet (don't clear selectedItem - let sheet keep it during exit animation)
  const handleCloseActions = useCallback(() => {
    setIsActionsOpen(false);
    setIsActionLoading(false);
    // Note: selectedItem is intentionally NOT cleared here to allow exit animation
    // The sheet caches the item internally and will work with stale data during animation
  }, []);

  // Handle action from sheet
  // data parameter contains extra info like { personName } for lend action
  const handleAction = useCallback(async (action, item, data) => {
    switch (action) {
      case 'edit':
        handleCloseActions();
        // Route to correct edit page based on item type
        if (item.type === ITEM_TYPE_VIDEO) {
          navigate(`/libraries/${libraryId}/videos/${item.id}/edit`);
        } else {
          navigate(`/libraries/${libraryId}/books/${item.id}/edit`);
        }
        break;
      case 'lend':
        setIsActionLoading(true);
        try {
          await lendItem(libraryId, item.id, data.personName);
          handleCloseActions();
        } catch (err) {
          toast.error(err.message || 'Failed to lend item');
          setIsActionLoading(false);
        }
        break;
      case 'return':
        setIsActionLoading(true);
        try {
          await returnItem(libraryId, item.id, item.lentTo);
          handleCloseActions();
        } catch (err) {
          toast.error(err.message || 'Failed to return item');
          setIsActionLoading(false);
        }
        break;
      case 'delete':
        setIsActionLoading(true);
        try {
          await deleteItem(libraryId, item.id);
          handleCloseActions();
        } catch (err) {
          toast.error(err.message || 'Failed to delete item');
          setIsActionLoading(false);
        }
        break;
      default:
        break;
    }
  }, [libraryId, navigate, deleteItem, lendItem, returnItem, toast, handleCloseActions]);

  // Handle add item from AppBar (no collection prefilled)
  const handleAddItem = useCallback(() => {
    setPrefilledCollection(null);
    setIsAddItemOpen(true);
  }, []);

  // Handle "..." press on collection header
  const handleCollectionMore = useCallback((collection) => {
    setSelectedCollection(collection);
    setIsCollectionActionsOpen(true);
  }, []);

  // Handle adding book to selected collection
  const handleAddBookToCollection = useCallback(() => {
    if (!selectedCollection) return;
    navigate(`/libraries/${libraryId}/add-book`, {
      state: { collection: selectedCollection, order: '1' }
    });
  }, [selectedCollection, libraryId, navigate]);

  // Handle adding video to selected collection
  const handleAddVideoToCollection = useCallback(() => {
    if (!selectedCollection) return;
    navigate(`/libraries/${libraryId}/add-video`, {
      state: { collection: selectedCollection, order: '1' }
    });
  }, [selectedCollection, libraryId, navigate]);

  // Handle deleting collection
  const handleDeleteCollection = useCallback(async () => {
    if (!selectedCollection) return;
    try {
      await librariesApi.deleteCollection(libraryId, selectedCollection.id);
      // Refresh items (orphaned items will no longer have collectionId)
      await fetchItems(libraryId, true);
      toast.success('Collection deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete collection');
    }
  }, [selectedCollection, libraryId, fetchItems, toast]);

  // Handle opening new collection sheet
  const handleAddCollection = useCallback(() => {
    setIsNewCollectionOpen(true);
  }, []);

  // Handle creating new collection
  const handleCreateCollection = useCallback(async (name) => {
    setIsCreatingCollection(true);
    try {
      await librariesApi.createCollection(libraryId, { name });
      setIsNewCollectionOpen(false);
      // Refresh items to show the new collection (collections come with items from API)
      await fetchItems(libraryId, true);
      toast.success('Collection created');
    } catch (err) {
      toast.error(err.message || 'Failed to create collection');
    } finally {
      setIsCreatingCollection(false);
    }
  }, [libraryId, fetchItems, toast]);

  // Render AppBar with appropriate configuration
  const renderAppBar = () => (
    <AppBar
      title={library?.name || 'Library'}
      subtitle={isSharedLibrary ? `Shared by ${library?.sharedFrom}` : undefined}
      onTitleClick={handleScrollToTop}
      headerRight={
        !isSharedLibrary ? (
          <button
            onClick={handleAddItem}
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-accent"
            aria-label="Add item"
          >
            <Plus className="h-5 w-5" />
          </button>
        ) : undefined
      }
    />
  );

  if (!library) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {renderAppBar()}
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground">Library not found</p>
        </div>
      </div>
    );
  }

  // Initial loading state
  if (isLoading && items.length === 0) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {renderAppBar()}
        <div className="flex flex-1 items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state (no data)
  if (error && items.length === 0) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {renderAppBar()}
        <div className="flex-1 min-h-0 relative">
          <PullToRefresh onRefresh={handleRefresh}>
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">Pull down to retry</p>
          </div>
          </PullToRefresh>
        </div>
      </div>
    );
  }

  // Empty state with bookshelf illustration
  if (items.length === 0) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {renderAppBar()}
        <div className="flex-1 min-h-0 relative">
          <PullToRefresh onRefresh={handleRefresh}>
          <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
            <EmptyBookshelf className="w-32 h-28 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-lg font-medium">No books yet</p>
              <p className="text-sm text-muted-foreground">
                {isSharedLibrary
                  ? 'This library is empty.'
                  : 'Add books to this library to see them here.'}
              </p>
            </div>
          </div>
          </PullToRefresh>
        </div>
      </div>
    );
  }

  // Items list (unified: standalone + collections, alphabetically sorted)
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {renderAppBar()}
      <div className="flex-1 min-h-0 relative">
        <PullToRefresh
          ref={pullToRefreshRef}
          onRefresh={handleRefresh}
        >
        <div className="p-4 space-y-2">
          {sortedList.map((entry, idx) => {
            if (entry.type === 'collection') {
              return (
                <CollectionCard
                  key={`collection-${entry.collection.id}`}
                  collection={entry.collection}
                  items={entry.items}
                  onItemClick={(item) => {
                    // Route to correct detail page based on item type
                    if (item.type === ITEM_TYPE_VIDEO) {
                      navigate(`/libraries/${libraryId}/videos/${item.id}`);
                    } else {
                      navigate(`/libraries/${libraryId}/books/${item.id}`);
                    }
                  }}
                  onItemLongPress={isSharedLibrary ? undefined : handleItemLongPress}
                  onMorePress={isSharedLibrary ? undefined : handleCollectionMore}
                  isSharedLibrary={isSharedLibrary}
                  index={idx}
                />
              );
            }
            // Render VideoCard for videos, BookCard for books
            const item = entry.data;
            if (item.type === ITEM_TYPE_VIDEO) {
              return (
                <VideoCard
                  key={item.id}
                  video={item}
                  onClick={(video) => {
                    navigate(`/libraries/${libraryId}/videos/${video.id}`);
                  }}
                  onLongPress={isSharedLibrary ? undefined : handleItemLongPress}
                  isSharedLibrary={isSharedLibrary}
                  index={idx}
                />
              );
            }
            return (
              <BookCard
                key={item.id}
                book={item}
                onClick={(book) => {
                  navigate(`/libraries/${libraryId}/books/${book.id}`);
                }}
                onLongPress={isSharedLibrary ? undefined : handleItemLongPress}
                isSharedLibrary={isSharedLibrary}
                index={idx}
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
      </div>

      {/* Item actions sheet */}
      <ItemActionsSheet
        item={selectedItem}
        isOpen={isActionsOpen}
        onClose={handleCloseActions}
        onAction={handleAction}
        isLoading={isActionLoading}
      />

      {/* Add item type selector (from AppBar + button) */}
      <AddItemSheet
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        onSelectBook={() => navigate(`/libraries/${libraryId}/add-book`)}
        onSelectVideo={() => navigate(`/libraries/${libraryId}/add-video`)}
        onSelectCollection={handleAddCollection}
      />

      {/* Collection actions sheet */}
      <CollectionActionsSheet
        isOpen={isCollectionActionsOpen}
        onClose={() => setIsCollectionActionsOpen(false)}
        collectionName={selectedCollection?.name}
        onAddBook={handleAddBookToCollection}
        onAddVideo={handleAddVideoToCollection}
        onDelete={handleDeleteCollection}
      />

      {/* New collection sheet */}
      <NewCollectionSheet
        isOpen={isNewCollectionOpen}
        onClose={() => setIsNewCollectionOpen(false)}
        onSubmit={handleCreateCollection}
        isLoading={isCreatingCollection}
      />
    </div>
  );
};

export default LibraryContent;
