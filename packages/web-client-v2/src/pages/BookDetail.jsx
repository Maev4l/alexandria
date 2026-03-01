// Edited by Claude.
// Book detail page - immersive hero cover with dynamic color extraction
// Shows cover with reflection, title, authors, summary, ISBN, collection, lent status
import { useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, History } from 'lucide-react';
import { AppBar } from '@/navigation';
import { useItemData } from '@/hooks';
import FadeImage from '@/components/FadeImage';
import { useExtractedColor, createCoverGradient } from '@/lib/colorExtractor';

const BookDetail = () => {
  const { libraryId, itemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { item: contextItem, library, isSharedLibrary } = useItemData(libraryId, itemId);

  // Use item from context, or fallback to item passed via location.state (from Search)
  const book = contextItem || location.state?.item;

  // Prioritize base64 picture field over pictureUrl
  const imageUrl = book?.picture
    ? `data:image/webp;base64,${book.picture}`
    : book?.pictureUrl || null;
  const hasImage = !!imageUrl;
  const authors = book?.authors?.join(', ') || '';
  const isLent = !!book?.lentTo;

  // Extract dominant color from cover for ambient background
  const { color } = useExtractedColor(imageUrl);
  const gradientStyle = useMemo(() => {
    if (!color) return {};
    return { background: createCoverGradient(color, 0.35) };
  }, [color]);

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
              <History className="h-5 w-5" />
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 min-h-0 relative">
        {/* Dynamic gradient background based on cover color */}
        <div
          className="absolute inset-0 transition-opacity duration-700 pointer-events-none"
          style={gradientStyle}
        />

        <div className="absolute inset-0 overflow-y-auto">
          {/* Hero section with cover and reflection */}
          <div className="relative pt-6 pb-4 flex flex-col items-center">
            {/* Cover with shadow */}
            <div className="relative">
              <div className="w-44 h-64 rounded-[3px_10px_10px_3px] bg-muted/50 flex items-center justify-center overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                {hasImage ? (
                  <FadeImage
                    src={imageUrl}
                    alt={book.title}
                    className="w-full h-full object-cover"
                    fallback={<BookOpen className="h-14 w-14 text-muted-foreground/50" />}
                  />
                ) : (
                  <BookOpen className="h-14 w-14 text-muted-foreground/50" />
                )}
              </div>

              {/* Reflection effect */}
              {hasImage && (
                <div
                  className="absolute top-full left-0 right-0 h-20 overflow-hidden pointer-events-none"
                  style={{
                    transform: 'scaleY(-1)',
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.25), transparent 60%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.25), transparent 60%)',
                  }}
                >
                  <div className="w-44 h-64 rounded-[3px_10px_10px_3px] overflow-hidden blur-[2px] opacity-60">
                    <FadeImage
                      src={imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Spacing for reflection */}
            <div className="h-8" />

            {/* Title and authors */}
            <div className="text-center space-y-1 px-6 mt-2">
              <h1 className="text-2xl font-semibold">{book.title}</h1>
              {authors && (
                <p className="text-muted-foreground text-lg">{authors}</p>
              )}
            </div>

            {/* Lent status badge */}
            {isLent && (
              <div className="mt-4">
                <span className="px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium border border-amber-500/30">
                  {isSharedLibrary ? 'Lent' : `Lent to ${book.lentTo}`}
                </span>
              </div>
            )}
          </div>

          {/* Details section - glass card */}
          <div className="px-4 pb-8">
            <div className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-2xl border border-[var(--glass-border)] p-4 space-y-4">
              {/* ISBN */}
              {book.isbn && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ISBN</p>
                  <p className="text-sm font-mono">{book.isbn}</p>
                </div>
              )}

              {/* Collection */}
              {book.collectionName && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Collection</p>
                  <p className="text-sm">
                    {book.collectionName}
                    {book.order != null && (
                      <span className="text-muted-foreground"> #{book.order}</span>
                    )}
                  </p>
                </div>
              )}

              {/* Summary */}
              {book.summary && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Summary</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{book.summary}</p>
                </div>
              )}

              {/* Empty state if no details */}
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
