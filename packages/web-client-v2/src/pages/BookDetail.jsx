// Edited by Claude.
// Book detail page - displays full book information
// Shows cover, title, authors, summary, ISBN, collection, lent status
import { useEffect } from 'react';
import { BookOpen, Pencil } from 'lucide-react';
import { useNavigation } from '@/navigation';

const BookDetail = () => {
  const { setOptions, params, navigate } = useNavigation();
  const library = params?.library;
  const book = params?.book;

  const hasImage = book?.pictureUrl || book?.picture;
  const authors = book?.authors?.join(', ') || '';
  const isLent = !!book?.lentTo;

  // Set up header with Edit button
  useEffect(() => {
    setOptions({
      title: book?.title || 'Book',
      headerRight: (
        <button
          onClick={() => navigate('editBook', { push: true, params: { library, book } })}
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-accent"
          aria-label="Edit book"
        >
          <Pencil className="h-5 w-5" />
        </button>
      ),
    });
  }, [setOptions, book, library, navigate]);

  if (!book) {
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
              Lent to {book.lentTo}
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
  );
};

export default BookDetail;
