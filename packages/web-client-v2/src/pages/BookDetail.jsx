// Edited by Claude.
// Book detail page - displays full book information (read-only)
// Shows cover, title, authors, summary, ISBN, collection, lent status
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, History } from 'lucide-react';
import { AppBar } from '@/navigation';
import { useItemData } from '@/hooks';

const BookDetail = () => {
  const { libraryId, itemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { item: contextItem, library, isSharedLibrary } = useItemData(libraryId, itemId);

  // Use item from context, or fallback to item passed via location.state (from Search)
  const book = contextItem || location.state?.item;

  const hasImage = book?.pictureUrl || book?.picture;
  const authors = book?.authors?.join(', ') || '';
  const isLent = !!book?.lentTo;

  if (!book) {
    return (
      <div className="flex flex-col h-full">
        <AppBar title="Book" />
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground">Book not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AppBar
        title={book.title}
        headerRight={
          !isSharedLibrary ? (
            <button
              onClick={() => navigate(`/libraries/${libraryId}/items/${itemId}/history`)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-accent"
              aria-label="View history"
            >
              <History className="h-5 w-5" />
            </button>
          ) : undefined
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6 pb-8">
          {/* Cover image - asymmetric radius mimics real book (spine left, pages right) */}
          <div className="flex justify-center">
            <div className="w-40 h-56 rounded-[3px_8px_8px_3px] bg-muted flex items-center justify-center overflow-hidden border border-border shadow-[var(--card-shadow-hover)]">
              {hasImage ? (
                <img
                  src={book.pictureUrl || `data:image/webp;base64,${book.picture}`}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <BookOpen className="h-12 w-12 text-muted-foreground/50" />
              )}
            </div>
          </div>

          {/* Title and authors */}
          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold">{book.title}</h1>
            {authors && (
              <p className="text-muted-foreground">{authors}</p>
            )}
          </div>

          {/* Lent status badge */}
          {isLent && (
            <div className="flex justify-center">
              <span className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm font-medium">
                {isSharedLibrary ? 'Lent' : `Lent to ${book.lentTo}`}
              </span>
            </div>
          )}

          {/* Details section */}
          <div className="space-y-4">
            {/* ISBN */}
            {book.isbn && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ISBN</p>
                <p className="text-sm">{book.isbn}</p>
              </div>
            )}

            {/* Collection */}
            {book.collection && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Collection</p>
                <p className="text-sm">
                  {book.collection}
                  {book.order != null && ` (#${book.order})`}
                </p>
              </div>
            )}

            {/* Summary */}
            {book.summary && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Summary</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{book.summary}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
