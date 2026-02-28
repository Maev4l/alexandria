// Edited by Claude.
// Card component for displaying a book in the library detail list
// Supports optional order number display for items within collections
// Supports long press for actions
import { useRef, useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import FadeImage from './FadeImage';

const LONG_PRESS_DURATION = 500;
const STAGGER_DELAY = 50; // ms per item for staggered animation

const BookCard = ({ book, onClick, onLongPress, showOrder = false, compact = false, isSharedLibrary = false, index }) => {
  const hasImage = book.pictureUrl || book.picture;
  const authors = book.authors?.join(', ') || '';
  const isLent = !!book.lentTo;

  const pressTimer = useRef(null);
  const isLongPress = useRef(false);

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress?.(book);
    }, LONG_PRESS_DURATION);
  }, [book, onLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    // Don't trigger click if it was a long press
    if (!isLongPress.current) {
      onClick?.(book);
    }
  }, [book, onClick]);

  // Staggered animation style - only apply to non-compact (top-level) cards
  const animationStyle = index != null && !compact
    ? { animationDelay: `${index * STAGGER_DELAY}ms` }
    : undefined;

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(e) => {
        // Prevent context menu on long press, trigger action instead
        if (onLongPress) {
          e.preventDefault();
          onLongPress(book);
        }
      }}
      style={animationStyle}
      className={cn(
        'w-full flex gap-3 text-left select-none',
        'transition-[background-color,box-shadow] duration-200',
        'hover:bg-accent/50 active:bg-accent',
        compact
          ? 'p-2 rounded-md bg-muted/30'
          : 'p-3 rounded-lg border border-border bg-card shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)]',
        // Staggered fade-in animation for non-compact cards
        index != null && !compact && 'animate-fade-in-up'
      )}
    >
      {/* Order number badge (for collection items) */}
      {showOrder && book.order != null && (
        <div className="shrink-0 w-6 flex items-center justify-center">
          <span className="text-sm font-medium text-muted-foreground">
            {book.order}
          </span>
        </div>
      )}

      {/* Book cover or placeholder - asymmetric radius mimics real book (spine left, pages right) */}
      <div className="relative shrink-0">
        <div
          className={cn(
            'bg-muted flex items-center justify-center overflow-hidden',
            // Realistic book corners: 2px spine (left), 6px pages (right)
            'rounded-[2px_6px_6px_2px]',
            compact ? 'w-10 h-14' : 'w-12 h-16'
          )}
        >
          {hasImage ? (
            <FadeImage
              src={book.pictureUrl || `data:image/webp;base64,${book.picture}`}
              alt={book.title}
              className="w-full h-full object-cover"
              fallback={
                <BookOpen className={cn(
                  'text-muted-foreground/50',
                  compact ? 'h-5 w-5' : 'h-6 w-6'
                )} />
              }
            />
          ) : (
            <BookOpen className={cn(
              'text-muted-foreground/50',
              compact ? 'h-5 w-5' : 'h-6 w-6'
            )} />
          )}
        </div>
        {/* Lent ribbon overlay */}
        {isLent && !compact && <div className="lent-ribbon" />}
      </div>

      {/* Book info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className={cn('font-medium truncate', compact && 'text-sm')}>
          {book.title}
        </p>
        {authors && (
          <p className={cn(
            'text-muted-foreground truncate',
            compact ? 'text-xs' : 'text-sm'
          )}>
            {authors}
          </p>
        )}
        {/* Show lent-to name as text (ribbon already shows "LENT" on cover) */}
        {isLent && !isSharedLibrary && (
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
            to {book.lentTo}
          </p>
        )}
      </div>
    </button>
  );
};

export default BookCard;
