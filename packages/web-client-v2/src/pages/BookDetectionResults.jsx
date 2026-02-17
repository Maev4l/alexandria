// Edited by Claude.
// Book detection results page - shows books found from ISBN lookup
// User selects a book → creates it directly via context
import { useEffect, useState, useCallback } from 'react';
import { Loader2, AlertCircle, BookOpen, Check } from 'lucide-react';
import { useNavigation } from '@/navigation';
import { detectionApi } from '@/api';
import { useLibraries } from '@/state';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';

const BookDetectionResults = () => {
  const { setOptions, params, navigate, goBack } = useNavigation();
  const toast = useToast();
  const { createBook } = useLibraries();
  const library = params?.library;
  const isbn = params?.isbn;

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
      await createBook(library.id, {
        title: selected.title || '',
        summary: selected.summary || '',
        authors: selected.authors || [],
        isbn: selected.isbn || isbn,
        pictureUrl: selected.pictureUrl || null,
      });
      // Go back twice: BookDetectionResults → AddBook → LibraryContent
      goBack();
      goBack();
    } catch (err) {
      toast.error(err.message || 'Failed to add book');
      setIsCreating(false);
    }
  }, [selectedIndex, results, library, isbn, goBack, toast, isCreating, createBook]);

  // Set up header with Add button
  useEffect(() => {
    const canAdd = selectedIndex !== null && results[selectedIndex] && !results[selectedIndex].error && !isCreating;

    setOptions({
      title: 'Select Book',
      headerRight: (
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
      ),
    });
  }, [setOptions, handleAdd, selectedIndex, results, isCreating]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Looking up ISBN {isbn}...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={fetchResults}
          className="text-sm text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // No results - offer manual entry
  if (results.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
        <BookOpen className="h-10 w-10 text-muted-foreground/50" />
        <div>
          <p className="font-medium">No books found</p>
          <p className="text-sm text-muted-foreground">
            ISBN {isbn} was not found in any database
          </p>
        </div>
        <button
          onClick={() => navigate('newBook', { push: true, params: { library } })}
          className="text-sm text-primary hover:underline"
        >
          Enter details manually
        </button>
      </div>
    );
  }

  // Results list
  return (
    <div className="absolute inset-0 overflow-y-auto">
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
              className={cn(
                'w-full flex gap-3 p-3 rounded-lg border text-left transition-colors',
                hasError
                  ? 'opacity-50 cursor-not-allowed border-border bg-muted/30'
                  : isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50',
                isCreating && 'pointer-events-none'
              )}
            >
              {/* Cover image */}
              <div className="w-16 h-22 flex-shrink-0 rounded bg-muted overflow-hidden">
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
                <p className="font-medium text-sm line-clamp-2">{book.title || 'Unknown title'}</p>
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

              {/* Selection indicator */}
              {!hasError && (
                <div className={cn(
                  'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                  isSelected
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/30'
                )}>
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BookDetectionResults;
