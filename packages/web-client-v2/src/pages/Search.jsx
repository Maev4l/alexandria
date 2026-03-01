// Edited by Claude.
// Spotlight-style search - full-screen overlay with floating input and instant results
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X, Loader2, Clock, BookOpen, Film, Library, Users } from 'lucide-react';

const ITEM_TYPE_VIDEO = 1;
import { searchApi } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { cn } from '@/lib/utils';
import FadeImage from '@/components/FadeImage';

const RECENT_SEARCHES_KEY = 'alexandria_recent_searches';
const STAGGER_DELAY = 40;
const MAX_RECENT_SEARCHES = 5;
const MIN_SEARCH_LENGTH = 3;
const DEBOUNCE_MS = 300;

// Persist recent searches in localStorage
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
  } catch {}
};

// Search result card - glassmorphism style
const SearchResultCard = ({ item, onClick, isShared, index }) => {
  // Prioritize base64 picture over pictureUrl
  const hasImage = item.picture || item.pictureUrl;
  const isVideo = item.type === ITEM_TYPE_VIDEO;
  const subtitle = isVideo
    ? item.directors?.[0] || ''
    : item.authors?.join(', ') || '';

  return (
    <button
      onClick={() => onClick(item)}
      style={{ animationDelay: `${index * STAGGER_DELAY}ms` }}
      className={cn(
        'w-full flex gap-3 p-3 rounded-xl text-left select-none',
        'bg-[var(--glass-bg)] backdrop-blur-xl',
        'border border-[var(--glass-border)]',
        'transition-all duration-200',
        'hover:bg-accent/30 active:scale-[0.99]',
        'animate-fade-in-up'
      )}
    >
      {/* Cover/poster */}
      <div className={cn(
        'shrink-0 w-12 h-16 bg-muted/50 flex items-center justify-center overflow-hidden',
        'shadow-[2px_2px_8px_rgba(0,0,0,0.3)]',
        isVideo ? 'rounded-md' : 'rounded-[2px_6px_6px_2px]'
      )}>
        {hasImage ? (
          <FadeImage
            src={item.picture ? `data:image/webp;base64,${item.picture}` : item.pictureUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            fallback={
              isVideo
                ? <Film className="h-5 w-5 text-muted-foreground/50" />
                : <BookOpen className="h-5 w-5 text-muted-foreground/50" />
            }
          />
        ) : isVideo ? (
          <Film className="h-5 w-5 text-muted-foreground/50" />
        ) : (
          <BookOpen className="h-5 w-5 text-muted-foreground/50" />
        )}
      </div>

      {/* Item info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="font-medium truncate">{item.title}</p>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
        {item.libraryName && (
          <p className="text-xs text-muted-foreground/70 truncate mt-0.5 flex items-center gap-1">
            {isShared ? (
              <Users className="h-3 w-3 shrink-0 text-primary/70" />
            ) : (
              <Library className="h-3 w-3 shrink-0" />
            )}
            {item.libraryName}
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
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = query.trim();

    if (trimmed.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setHasSearched(false);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const terms = trimmed.split(/\s+/).filter(Boolean);
        const response = await searchApi.search(terms);
        setResults(response.results || []);
        setHasSearched(true);
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

  const isSharedItem = useCallback((item) => {
    return item.ownerId && item.ownerId !== user?.id;
  }, [user?.id]);

  const handleItemClick = useCallback((item) => {
    const path = item.type === ITEM_TYPE_VIDEO
      ? `/libraries/${item.libraryId}/videos/${item.id}`
      : `/libraries/${item.libraryId}/books/${item.id}`;
    navigate(path, { state: { item } });
  }, [navigate]);

  const showRecentSearches = query.trim().length < MIN_SEARCH_LENGTH && recentSearches.length > 0;
  const showEmptyState = !query.trim() && !showRecentSearches && !isLoading;

  return (
    <div className="flex flex-col min-h-full">
      {/* Floating search input */}
      <div className="sticky top-0 z-10 px-4 pt-6 pb-4">
        <div className={cn(
          'relative rounded-2xl overflow-hidden',
          'bg-[var(--glass-bg)] backdrop-blur-xl',
          'border border-[var(--glass-border)]',
          'shadow-[0_4px_24px_rgba(0,0,0,0.2)]'
        )}>
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search books & videos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              'w-full h-14 pl-12 pr-12 bg-transparent',
              'text-lg text-foreground placeholder:text-muted-foreground',
              'focus:outline-none'
            )}
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-accent/50 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Character count hint */}
        {query.trim().length > 0 && query.trim().length < MIN_SEARCH_LENGTH && (
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Type {MIN_SEARCH_LENGTH - query.trim().length} more character{MIN_SEARCH_LENGTH - query.trim().length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 px-4 pb-6">
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => setQuery(query)}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Recent searches - horizontal chips */}
        {showRecentSearches && !isLoading && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Recent</span>
              </div>
              <button
                onClick={handleClearRecent}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((term, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentClick(term)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm',
                    'bg-muted/30 hover:bg-muted/50',
                    'border border-border/50',
                    'transition-colors'
                  )}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {showEmptyState && (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <SearchIcon className="h-10 w-10 text-primary/50" />
            </div>
            <p className="text-xl font-medium">Search your library</p>
            <p className="text-muted-foreground mt-1">
              Find books, videos, and more
            </p>
          </div>
        )}

        {/* No results */}
        {hasSearched && results.length === 0 && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <p className="text-xl font-medium">No results found</p>
            <p className="text-muted-foreground mt-1">
              Try different keywords
            </p>
          </div>
        )}

        {/* Search results */}
        {results.length > 0 && !isLoading && (
          <div className="animate-fade-in">
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
