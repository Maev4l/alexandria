// Edited by Claude.
// Book detail page - displays full book information (read-only)
// Shows cover, title, authors, summary, ISBN, collection, lent status
import { useEffect } from 'react';
import { BookOpen, History } from 'lucide-react';
import { useNavigation } from '@/navigation';
import { useLibraries } from '@/state';

const BookDetail = () => {
  const { setOptions, params, navigate } = useNavigation();
  const { getItemsState } = useLibraries();

  const library = params?.library;
  const book = params?.book;

  // Get the current item state from context (may be updated after lend/return)
  const itemsState = getItemsState(library?.id);
  const currentBook = itemsState.items.find((item) => item.id === book?.id) || book;

  const hasImage = currentBook?.pictureUrl || currentBook?.picture;
  const authors = currentBook?.authors?.join(', ') || '';
  const isLent = !!currentBook?.lentTo;
  const isSharedLibrary = !!library?.sharedFrom;

  // Set up header with History button (hidden for shared libraries)
  useEffect(() => {
    setOptions({
      title: currentBook?.title || 'Book',
      // Only show history button for owned libraries
      headerRight: isSharedLibrary ? null : (
        <button
          onClick={() => navigate('itemHistory', { push: true, params: { library, book: currentBook } })}
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-accent"
          aria-label="View history"
        >
          <History className="h-5 w-5" />
        </button>
      ),
    });
  }, [setOptions, currentBook, library, navigate, isSharedLibrary]);

  if (!currentBook) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-muted-foreground">Book not found</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="p-4 space-y-6 pb-8">
        {/* Cover image */}
        <div className="flex justify-center">
          <div className="w-40 h-56 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border shadow-md">
            {hasImage ? (
              <img
                src={currentBook.pictureUrl || `data:image/webp;base64,${currentBook.picture}`}
                alt={currentBook.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <BookOpen className="h-12 w-12 text-muted-foreground/50" />
            )}
          </div>
        </div>

        {/* Title and authors */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold">{currentBook.title}</h1>
          {authors && (
            <p className="text-muted-foreground">{authors}</p>
          )}
        </div>

        {/* Lent status badge */}
        {isLent && (
          <div className="flex justify-center">
            <span className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm font-medium">
              {isSharedLibrary ? 'Lent' : `Lent to ${currentBook.lentTo}`}
            </span>
          </div>
        )}

        {/* Details section */}
        <div className="space-y-4">
          {/* ISBN */}
          {currentBook.isbn && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ISBN</p>
              <p className="text-sm">{currentBook.isbn}</p>
            </div>
          )}

          {/* Collection */}
          {currentBook.collection && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Collection</p>
              <p className="text-sm">
                {currentBook.collection}
                {currentBook.order != null && ` (#${currentBook.order})`}
              </p>
            </div>
          )}

          {/* Summary */}
          {currentBook.summary && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Summary</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{currentBook.summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
