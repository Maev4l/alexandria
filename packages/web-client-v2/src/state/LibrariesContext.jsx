// Edited by Claude.
// Libraries and items state management via React Context
// Provides shared state for libraries and their items across the application
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { librariesApi } from '@/api';

const LibrariesContext = createContext(null);

// Item type constants (matches backend domain.ItemType)
const ITEM_TYPE_COLLECTION = 2;

// Initial state for items in a library
// items: Array of items where type=2 (collections) have nested items array
const initialItemsState = {
  items: [],
  nextToken: null,
  isLoading: false,
  error: null,
};

// Merge items from paginated response, handling partial collections
// If incoming collection has partial: true, find and merge its nested items into the matching collection
// (Search by ID, not just last item, since standalone items may appear between collection pages)
const mergeItems = (existing, incoming) => {
  if (!incoming || incoming.length === 0) return existing;

  const result = [...existing];
  for (const item of incoming) {
    // Check if this is a partial collection that continues from previous page
    if (item.type === ITEM_TYPE_COLLECTION && item.partial) {
      // Search for matching collection by ID (may not be the last item)
      const existingIdx = result.findIndex(
        (r) => r.type === ITEM_TYPE_COLLECTION && r.id === item.id
      );
      if (existingIdx >= 0) {
        // Merge nested items into existing collection
        result[existingIdx] = {
          ...result[existingIdx],
          items: [...(result[existingIdx].items || []), ...(item.items || [])]
        };
        continue;
      }
    }
    result.push(item);
  }
  return result;
};

export const LibrariesProvider = ({ children }) => {
  const [libraries, setLibraries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false); // Track if initial fetch done

  // Items state per library: { [libraryId]: { items, nextToken, isLoading, error } }
  const [itemsByLibrary, setItemsByLibrary] = useState({});

  // =====================
  // LIBRARIES ACTIONS
  // =====================

  // Fetch all libraries
  const fetchLibraries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await librariesApi.getAll();
      setLibraries(data.libraries || []);
    } catch (err) {
      setError(err.message);
      setLibraries([]);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, []);

  // Create a new library
  const createLibrary = useCallback(async (data) => {
    const result = await librariesApi.create(data);
    // Refetch to get the complete library data
    await fetchLibraries();
    return result;
  }, [fetchLibraries]);

  // Update a library
  const updateLibrary = useCallback(async (libraryId, data) => {
    await librariesApi.update(libraryId, data);
    // Update local state
    setLibraries((prev) =>
      prev.map((lib) =>
        lib.id === libraryId ? { ...lib, ...data } : lib
      )
    );
  }, []);

  // Delete a library
  const deleteLibrary = useCallback(async (libraryId) => {
    await librariesApi.delete(libraryId);
    // Remove from local state
    setLibraries((prev) => prev.filter((lib) => lib.id !== libraryId));
    // Clear items for this library
    setItemsByLibrary((prev) => {
      const next = { ...prev };
      delete next[libraryId];
      return next;
    });
  }, []);

  // Share a library with another user
  const shareLibrary = useCallback(async (libraryId, userName) => {
    await librariesApi.share(libraryId, userName);
    // Update local state to reflect the new share
    setLibraries((prev) =>
      prev.map((lib) =>
        lib.id === libraryId
          ? { ...lib, sharedTo: [...(lib.sharedTo || []), userName] }
          : lib
      )
    );
  }, []);

  // Unshare a library from one or more users
  const unshareLibrary = useCallback(async (libraryId, userNames) => {
    // Ensure userNames is an array
    const users = Array.isArray(userNames) ? userNames : [userNames];
    await librariesApi.unshare(libraryId, users);
    // Update local state to remove the shares
    setLibraries((prev) =>
      prev.map((lib) =>
        lib.id === libraryId
          ? { ...lib, sharedTo: (lib.sharedTo || []).filter((u) => !users.includes(u)) }
          : lib
      )
    );
  }, []);

  // =====================
  // ITEMS ACTIONS
  // =====================

  // Get items state for a library (with defaults)
  const getItemsState = useCallback((libraryId) => {
    return itemsByLibrary[libraryId] || initialItemsState;
  }, [itemsByLibrary]);

  // Fetch items for a library (initial load or refresh)
  // API returns grouped items: { items: [...], nextToken }
  // Collections (type=2) have nested items array already populated
  const fetchItems = useCallback(async (libraryId, refresh = false) => {
    // Update loading state
    setItemsByLibrary((prev) => ({
      ...prev,
      [libraryId]: {
        ...(prev[libraryId] || initialItemsState),
        isLoading: true,
        error: null,
        // Clear items on refresh
        ...(refresh ? { items: [], nextToken: null } : {}),
      },
    }));

    try {
      const data = await librariesApi.getItems(libraryId, { limit: 20 });
      setItemsByLibrary((prev) => ({
        ...prev,
        [libraryId]: {
          items: data.items || [],
          nextToken: data.nextToken || null,
          isLoading: false,
          error: null,
        },
      }));
    } catch (err) {
      setItemsByLibrary((prev) => ({
        ...prev,
        [libraryId]: {
          ...(prev[libraryId] || initialItemsState),
          isLoading: false,
          error: err.message || 'Failed to load items',
        },
      }));
    }
  }, []);

  // Load more items (pagination)
  // Handles partial collection merging when pagination splits a collection
  const loadMoreItems = useCallback(async (libraryId) => {
    const current = itemsByLibrary[libraryId];
    if (!current?.nextToken || current.isLoading) return;

    setItemsByLibrary((prev) => ({
      ...prev,
      [libraryId]: { ...prev[libraryId], isLoading: true },
    }));

    try {
      const data = await librariesApi.getItems(libraryId, {
        limit: 20,
        nextToken: current.nextToken,
      });
      setItemsByLibrary((prev) => ({
        ...prev,
        [libraryId]: {
          items: mergeItems(prev[libraryId]?.items || [], data.items || []),
          nextToken: data.nextToken || null,
          isLoading: false,
          error: null,
        },
      }));
    } catch (err) {
      setItemsByLibrary((prev) => ({
        ...prev,
        [libraryId]: {
          ...prev[libraryId],
          isLoading: false,
          // Silent fail for load more
        },
      }));
    }
  }, [itemsByLibrary]);

  // Invalidate items cache for a library (force refetch on next access)
  const invalidateItems = useCallback((libraryId) => {
    setItemsByLibrary((prev) => {
      const next = { ...prev };
      delete next[libraryId];
      return next;
    });
  }, []);

  // Create an item in a library
  const createBook = useCallback(async (libraryId, data) => {
    const result = await librariesApi.createBook(libraryId, data);
    // Invalidate to refetch with new item
    invalidateItems(libraryId);
    // Update library totalItems
    setLibraries((prev) =>
      prev.map((lib) =>
        lib.id === libraryId
          ? { ...lib, totalItems: (lib.totalItems || 0) + 1 }
          : lib
      )
    );
    return result;
  }, [invalidateItems]);

  // Update a book in a library
  const updateBook = useCallback(async (libraryId, itemId, data) => {
    await librariesApi.updateBook(libraryId, itemId, data);
    // Update local state
    setItemsByLibrary((prev) => {
      const current = prev[libraryId];
      if (!current) return prev;
      return {
        ...prev,
        [libraryId]: {
          ...current,
          items: current.items.map((item) =>
            item.id === itemId ? { ...item, ...data } : item
          ),
        },
      };
    });
  }, []);

  // Create a video in a library
  const createVideo = useCallback(async (libraryId, data) => {
    const result = await librariesApi.createVideo(libraryId, data);
    // Invalidate to refetch with new item
    invalidateItems(libraryId);
    // Update library totalItems
    setLibraries((prev) =>
      prev.map((lib) =>
        lib.id === libraryId
          ? { ...lib, totalItems: (lib.totalItems || 0) + 1 }
          : lib
      )
    );
    return result;
  }, [invalidateItems]);

  // Update a video in a library
  const updateVideo = useCallback(async (libraryId, itemId, data) => {
    await librariesApi.updateVideo(libraryId, itemId, data);
    // Update local state
    setItemsByLibrary((prev) => {
      const current = prev[libraryId];
      if (!current) return prev;
      return {
        ...prev,
        [libraryId]: {
          ...current,
          items: current.items.map((item) =>
            item.id === itemId ? { ...item, ...data } : item
          ),
        },
      };
    });
  }, []);

  // Delete an item from a library
  const deleteItem = useCallback(async (libraryId, itemId) => {
    await librariesApi.deleteItem(libraryId, itemId);
    // Remove from local state
    setItemsByLibrary((prev) => {
      const current = prev[libraryId];
      if (!current) return prev;
      return {
        ...prev,
        [libraryId]: {
          ...current,
          items: current.items.filter((item) => item.id !== itemId),
        },
      };
    });
    // Update library totalItems
    setLibraries((prev) =>
      prev.map((lib) =>
        lib.id === libraryId
          ? { ...lib, totalItems: Math.max(0, (lib.totalItems || 0) - 1) }
          : lib
      )
    );
  }, []);

  // Lend an item to a person
  const lendItem = useCallback(async (libraryId, itemId, personName) => {
    await librariesApi.createItemEvent(libraryId, itemId, { type: 'LENT', event: personName });
    // Update local state to reflect lent status
    setItemsByLibrary((prev) => {
      const current = prev[libraryId];
      if (!current) return prev;
      return {
        ...prev,
        [libraryId]: {
          ...current,
          items: current.items.map((item) =>
            item.id === itemId ? { ...item, lentTo: personName } : item
          ),
        },
      };
    });
  }, []);

  // Return a lent item
  const returnItem = useCallback(async (libraryId, itemId, personName) => {
    await librariesApi.createItemEvent(libraryId, itemId, { type: 'RETURNED', event: personName });
    // Update local state to clear lent status
    setItemsByLibrary((prev) => {
      const current = prev[libraryId];
      if (!current) return prev;
      return {
        ...prev,
        [libraryId]: {
          ...current,
          items: current.items.map((item) =>
            item.id === itemId ? { ...item, lentTo: null } : item
          ),
        },
      };
    });
  }, []);

  // =====================
  // DERIVED STATE
  // =====================

  // Separate owned vs shared libraries, sorted alphabetically by name
  const ownedLibraries = useMemo(
    () => libraries
      .filter((lib) => !lib.sharedFrom)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [libraries]
  );

  const sharedLibraries = useMemo(
    () => libraries
      .filter((lib) => lib.sharedFrom)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [libraries]
  );

  // =====================
  // CONTEXT VALUE
  // =====================

  const value = useMemo(() => ({
    // Libraries state
    libraries,
    ownedLibraries,
    sharedLibraries,
    isLoading,
    error,
    hasLoaded,
    // Libraries actions
    fetchLibraries,
    createLibrary,
    updateLibrary,
    deleteLibrary,
    shareLibrary,
    unshareLibrary,
    // Items state
    itemsByLibrary,
    getItemsState,
    // Items actions
    fetchItems,
    loadMoreItems,
    invalidateItems,
    createBook,
    updateBook,
    createVideo,
    updateVideo,
    deleteItem,
    lendItem,
    returnItem,
  }), [
    libraries,
    ownedLibraries,
    sharedLibraries,
    isLoading,
    error,
    hasLoaded,
    fetchLibraries,
    createLibrary,
    updateLibrary,
    deleteLibrary,
    shareLibrary,
    unshareLibrary,
    itemsByLibrary,
    getItemsState,
    fetchItems,
    loadMoreItems,
    invalidateItems,
    createBook,
    updateBook,
    createVideo,
    updateVideo,
    deleteItem,
    lendItem,
    returnItem,
  ]);

  return (
    <LibrariesContext.Provider value={value}>
      {children}
    </LibrariesContext.Provider>
  );
};

export const useLibraries = () => {
  const context = useContext(LibrariesContext);
  if (!context) {
    throw new Error('useLibraries must be used within a LibrariesProvider');
  }
  return context;
};
