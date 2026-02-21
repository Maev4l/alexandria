// Edited by Claude.
// Book detection results page - shows books found from ISBN lookup
// User selects a book -> creates it directly via context
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, AlertCircle, BookOpen, Check } from 'lucide-react';
import { AppBar } from '@/navigation';
import { detectionApi } from '@/api';
import { useLibraries } from '@/state';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';

const STAGGER_DELAY = 50; // ms per item for staggered animation

const BookDetectionResults = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { createBook } = useLibraries();

  // Get ISBN from location state
  const isbn = location.state?.isbn;

  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch detection results
  const fetchResults = useCallback(async () => {
    if (!isbn) {
      setError('No ISBN provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await detectionApi.detectBook(isbn);
      const books = data.detectedBooks || [];
      setResults(books);
      // Auto-select first result if only one valid result
      if (books.length === 1 && !books[0].error) {
        setSelectedIndex(0);
      }
    } catch (err) {
      setError(err.message || 'Failed to lookup ISBN');
    } finally {
      setIsLoading(false);
    }
  }, [isbn]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Create book directly from selected detection result
  const handleAdd = useCallback(async () => {
    if (selectedIndex === null || isCreating) return;

    const selected = results[selectedIndex];
    if (!selected || selected.error) return;

    setIsCreating(true);
    try {
      await createBook(libraryId, {
        title: selected.title || '',
        summary: selected.summary || '',
        authors: selected.authors || [],
        isbn: selected.isbn || isbn,
        pictureUrl: selected.pictureUrl || null,
      });
      // Go back 2 steps to library content (skip detection results + add-book)
      navigate(-2);
    } catch (err) {
      toast.error(err.message || 'Failed to add book');
      setIsCreating(false);
    }
  }, [selectedIndex, results, libraryId, isbn, navigate, toast, isCreating, createBook]);

  // Go back in history to library content
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Computed: can add book
  const canAdd = selectedIndex !== null && results[selectedIndex] && !results[selectedIndex].error && !isCreating;

  // Render AppBar
  const renderAppBar = () => (
    <AppBar
      title="Select Book"
      headerLeft={
        <button
          onClick={handleBack}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      }
      headerRight={
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className={cn(
            'px-3 py-1 text-sm font-medium rounded-md transition-colors',
            canAdd
              ? 'text-primary hover:bg-accent'
              : 'text-muted-foreground cursor-not-allowed'
          )}
        >
          {isCreating ? 'Adding...' : 'Add'}
        </button>
      }
    />
  );

  // Guard: no ISBN provided
  if (!isbn) {
    return (
      <div className="flex flex-col h-full">
        {renderAppBar()}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm text-muted-foreground">No ISBN provided</p>
          <button
            onClick={handleBack}
            className="text-sm text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {renderAppBar()}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Looking up ISBN {isbn}...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full">
        {renderAppBar()}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={fetchResults}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // No results - offer manual entry
  if (results.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {renderAppBar()}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium">No books found</p>
            <p className="text-sm text-muted-foreground">
              ISBN {isbn} was not found in any database
            </p>
          </div>
          <button
            onClick={() => navigate(`/libraries/${libraryId}/books/new`)}
            className="text-sm text-primary hover:underline"
          >
            Enter details manually
          </button>
        </div>
      </div>
    );
  }

  // Results list
  return (
    <div className="flex flex-col h-full">
      {renderAppBar()}
      <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Found {results.length} result{results.length !== 1 ? 's' : ''} for ISBN {isbn}
        </p>

        {results.map((book, index) => {
          const hasError = !!book.error;
          const isSelected = selectedIndex === index;

          return (
            <button
              key={book.id || `result-${index}`}
              onClick={() => !hasError && setSelectedIndex(index)}
              disabled={hasError || isCreating}
              style={{ animationDelay: `${index * STAGGER_DELAY}ms` }}
              className={cn(
                'w-full flex gap-3 p-3 rounded-xl border-2 text-left transition-all',
                'animate-fade-in-up',
                hasError
                  ? 'opacity-50 cursor-not-allowed border-border bg-muted/30'
                  : isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30',
                isCreating && 'pointer-events-none'
              )}
            >
              {/* Cover image - asymmetric radius mimics real book */}
              <div className="w-16 h-22 flex-shrink-0 rounded-[2px_6px_6px_2px] bg-muted overflow-hidden">
                {book.pictureUrl ? (
                  <img
                    src={book.pictureUrl}
                    alt={book.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              {/* Book info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm line-clamp-2">{book.title || 'Unknown title'}</p>
                  {isSelected && !hasError && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
                {book.authors && book.authors.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {book.authors.join(', ')}
                  </p>
                )}
                {book.source && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Source: {book.source}
                  </p>
                )}
                {hasError && (
                  <p className="text-xs text-destructive mt-1">{book.error}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
};

export default BookDetectionResults;
