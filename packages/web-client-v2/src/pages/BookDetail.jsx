// Edited by Claude.
// Book detail — "reading table": cover standing on a lit walnut ledge against linen,
// with a restrained linen-washed halo of the cover color. No reflection, no saturated band.
import { useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Book, Stamp } from 'lucide-react';
import { AppBar } from '@/navigation';
import { useItemData } from '@/hooks';
import FadeImage from '@/components/FadeImage';
import { useExtractedColor, createCoverHalo } from '@/lib/colorExtractor';

const BookDetail = () => {
  const { libraryId, itemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { item: contextItem, isSharedLibrary } = useItemData(libraryId, itemId);

  const book = contextItem || location.state?.item;

  const cloudFrontUrl = book?.picture
    ? `${book.picture}?v=${book.updatedAt ? new Date(book.updatedAt).getTime() : '0'}`
    : null;
  const hasImage = !!cloudFrontUrl;
  const authors = book?.authors?.join(', ') || '';
  const isLent = !!book?.lentTo;

  const { color } = useExtractedColor(cloudFrontUrl);
  const haloStyle = useMemo(() => ({ background: createCoverHalo(color), opacity: color ? 0.22 : 0 }), [color]);

  if (!book) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <AppBar title="Book" />
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground">Book not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AppBar
        title={book.title}
        headerRight={
          !isSharedLibrary ? (
            <button
              onClick={() => navigate(`/libraries/${libraryId}/items/${itemId}/history`)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-accent"
              aria-label="View history"
            >
              <Stamp className="h-5 w-5" />
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 min-h-0 relative">
        {/* Restrained linen-washed halo */}
        <div className="absolute inset-0 transition-opacity duration-700 pointer-events-none" style={haloStyle} />

        <div className="absolute inset-0 overflow-y-auto">
          {/* Hero: cover standing on a walnut ledge */}
          <div className="relative pt-8 px-6 flex flex-col items-center">
            <div className="w-44 h-64 rounded-[6px_6px_3px_3px] bg-muted flex items-center justify-center overflow-hidden shadow-[var(--shelf-shadow)] animate-cover-settle">
              {hasImage ? (
                <FadeImage src={cloudFrontUrl} alt={book.title} className="w-full h-full object-cover"
                  fallback={<Book className="h-14 w-14 text-muted-foreground/50" />} />
              ) : (
                <Book className="h-14 w-14 text-muted-foreground/50" />
              )}
            </div>
            {/* The lit walnut ledge */}
            <div className="shelf-ledge mt-0 h-2.5 w-56 max-w-full rounded-[1px]" />

            {/* Date-due slip tucked at the cover's lower edge */}
            {isLent && (
              <div className="lent-duecard -mt-1 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
                <div className="ephemera-caps text-[11px]">Lent</div>
                {!isSharedLibrary && (
                  <div className="mt-0.5 font-serif italic text-[14px]" style={{ color: '#946022' }}>to {book.lentTo}</div>
                )}
              </div>
            )}

            <div className="text-center mt-5 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
              <h1 className="font-sans text-2xl font-bold text-foreground">{book.title}</h1>
              {authors && <p className="font-serif italic text-lg text-muted-foreground mt-1">{authors}</p>}
            </div>
          </div>

          {/* Details: cream card on the table */}
          <div className="px-4 pt-6 pb-8">
            <div className="bg-card rounded-2xl shadow-[var(--card-shadow)] p-4 space-y-4">
              {book.isbn && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ISBN</p>
                  <p className="text-sm font-mono">{book.isbn}</p>
                </div>
              )}
              {book.collectionName && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Collection</p>
                  <p className="text-sm">
                    {book.collectionName}
                    {book.order != null && <span className="text-muted-foreground"> #{book.order}</span>}
                  </p>
                </div>
              )}
              {book.summary && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summary</p>
                  <p className="font-serif text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">{book.summary}</p>
                </div>
              )}
              {!book.isbn && !book.collectionName && !book.summary && (
                <p className="text-sm text-muted-foreground text-center py-2">No additional details</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
