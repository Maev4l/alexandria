// Edited by Claude.
// Search page - fuzzy search across all items (books + videos) with recent searches
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X, Loader2, Clock, BookOpen, Film, Library, Users } from 'lucide-react';

const ITEM_TYPE_VIDEO = 1;
import { searchApi } from '@/api';
import { AppBar } from '@/navigation';
import { useAuth } from '@/auth/AuthContext';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

const RECENT_SEARCHES_KEY = 'alexandria_recent_searches';
const STAGGER_DELAY = 50; // ms per item for staggered animation
const MAX_RECENT_SEARCHES = 5;
const MIN_SEARCH_LENGTH = 3;
const DEBOUNCE_MS = 300;

// Persist recent searches in localStorage (PWA-compatible)
const getRecentSearches = () => {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentSearch = (term) => {
  try {
    const recent = getRecentSearches();
    // Remove duplicate if exists, add to front
    const filtered = recent.filter((s) => s.toLowerCase() !== term.toLowerCase());
    const updated = [term, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
};

const clearRecentSearches = () => {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore storage errors
  }
};

// Search result card with library name - handles both books and videos
const SearchResultCard = ({ item, onClick, isShared, index }) => {
  const hasImage = item.pictureUrl || item.picture;
  const isVideo = item.type === ITEM_TYPE_VIDEO;
  // For books: authors, for videos: first director
  const subtitle = isVideo
    ? item.directors?.[0] || ''
    : item.authors?.join(', ') || '';

  return (
    <button
      onClick={() => onClick(item)}
      style={{ animationDelay: `${index * STAGGER_DELAY}ms` }}
      className={cn(
        'w-full flex gap-3 p-2 rounded-md bg-muted/30 text-left transition-colors',
        'hover:bg-accent/50 active:bg-accent select-none',
        'animate-fade-in-up'
      )}
    >
      {/* Cover/poster - asymmetric radius */}
      <div className="shrink-0 w-10 h-14 rounded-[2px_6px_6px_2px] bg-muted flex items-center justify-center overflow-hidden">
        {hasImage ? (
          <img
            src={item.pictureUrl || `data:image/webp;base64,${item.picture}`}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : isVideo ? (
          <Film className="h-5 w-5 text-muted-foreground/50" />
        ) : (
          <BookOpen className="h-5 w-5 text-muted-foreground/50" />
        )}
      </div>

      {/* Item info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
        {/* Library name with shared indicator */}
        {item.libraryName && (
          <p className="text-xs text-muted-foreground/70 truncate mt-0.5 flex items-center gap-1">
            {isShared ? (
              <Users className="h-3 w-3 shrink-0 text-green-600 dark:text-green-400" />
            ) : (
              <Library className="h-3 w-3 shrink-0" />
            )}
            {item.libraryName}
            {isShared && <span className="text-green-600 dark:text-green-400">(shared)</span>}
          </p>
        )}
      </div>
    </button>
  );
};

const Search = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState(getRecentSearches);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search effect
  useEffect(() => {
    // Clear any pending search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = query.trim();

    // Reset state if query too short
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setHasSearched(false);
      setError(null);
      return;
    }

    // Debounce the search
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Split query into terms for fuzzy search
        const terms = trimmed.split(/\s+/).filter(Boolean);
        const response = await searchApi.search(terms);
        setResults(response.results || []);
        setHasSearched(true);

        // Save to recent searches on successful search
        setRecentSearches(saveRecentSearch(trimmed));
      } catch (err) {
        setError(err.message || 'Search failed');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setError(null);
    inputRef.current?.focus();
  }, []);

  const handleRecentClick = useCallback((term) => {
    setQuery(term);
  }, []);

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  // Check if an item is from a shared library (owner is not current user)
  const isSharedItem = useCallback((item) => {
    return item.ownerId && item.ownerId !== user?.id;
  }, [user?.id]);

  // Navigate to detail page, passing item data via state
  // (items may not be loaded in LibrariesContext if user hasn't visited the library)
  const handleItemClick = useCallback((item) => {
    const path = item.type === ITEM_TYPE_VIDEO
      ? `/libraries/${item.libraryId}/videos/${item.id}`
      : `/libraries/${item.libraryId}/books/${item.id}`;
    navigate(path, { state: { item } });
  }, [navigate]);

  const showRecentSearches = query.trim().length < MIN_SEARCH_LENGTH && recentSearches.length > 0;

  return (
    <div className="flex flex-col h-full">
      <AppBar title="Search" />
      {/* Search input - sticky */}
      <div className="shrink-0 p-4 border-b border-border bg-background">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-accent"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        {query.trim().length > 0 && query.trim().length < MIN_SEARCH_LENGTH && (
          <p className="mt-2 text-xs text-muted-foreground">
            Type at least {MIN_SEARCH_LENGTH} characters to search
          </p>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="p-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => setQuery(query)}
              className="mt-2 text-sm text-primary underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Recent searches */}
        {showRecentSearches && !isLoading && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Recent searches</h3>
              <button
                onClick={handleClearRecent}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {recentSearches.map((term, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentClick(term)}
                  style={{ animationDelay: `${index * STAGGER_DELAY}ms` }}
                  className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent text-left animate-fade-in-up"
                >
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{term}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state - no query */}
        {!query.trim() && !showRecentSearches && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <SearchIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">Search your library</p>
            <p className="text-sm text-muted-foreground mt-1">
              Find books, videos, and more
            </p>
          </div>
        )}

        {/* No results */}
        {hasSearched && results.length === 0 && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try different keywords or check the spelling
            </p>
          </div>
        )}

        {/* Search results */}
        {results.length > 0 && !isLoading && (
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-3">
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </p>
            <div className="space-y-2">
              {results.map((item, idx) => (
                <SearchResultCard
                  key={item.id}
                  item={item}
                  onClick={handleItemClick}
                  isShared={isSharedItem(item)}
                  index={idx}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
