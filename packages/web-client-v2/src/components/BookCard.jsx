// Edited by Claude.
// Book standalone card — cover standing on a full-width walnut ledge.
// Media-equality layout shared in spirit with VideoCard. Presentation-only:
// navigation/edit routing lives in the parent (keyed on item.type).
import { useRef, useCallback, useState } from 'react';
import { Book } from 'lucide-react';
import { cn } from '@/lib/utils';
import FadeImage from './FadeImage';

const LONG_PRESS_DURATION = 500;
const LIFT_DELAY = 150;
const STAGGER_DELAY = 50;

const BookCard = ({ book, onClick, onLongPress, showOrder = false, compact = false, isSharedLibrary = false, isSelected = false, index }) => {
  const cloudFrontUrl = book.picture
    ? `${book.picture}?v=${book.updatedAt ? new Date(book.updatedAt).getTime() : '0'}`
    : null;
  const hasImage = !!cloudFrontUrl;
  const authors = book.authors?.join(', ') || '';
  const isLent = !!book.lentTo;

  const pressTimer = useRef(null);
  const liftTimer = useRef(null);
  const isLongPress = useRef(false);
  const [isLifting, setIsLifting] = useState(false);
  const showLift = isLifting || isSelected;

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    if (!compact && onLongPress) {
      liftTimer.current = setTimeout(() => setIsLifting(true), LIFT_DELAY);
    }
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setIsLifting(false);
      onLongPress?.(book);
    }, LONG_PRESS_DURATION);
  }, [book, compact, onLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    if (liftTimer.current) { clearTimeout(liftTimer.current); liftTimer.current = null; }
    setIsLifting(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!isLongPress.current) onClick?.(book);
  }, [book, onClick]);

  const animationStyle = index != null && !compact
    ? { animationDelay: `${index * STAGGER_DELAY}ms` }
    : undefined;

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(e) => { if (onLongPress) { e.preventDefault(); onLongPress(book); } }}
      style={animationStyle}
      aria-label={`${book.title}, book`}
      className={cn(
        'w-full text-left select-none',
        'transition-[box-shadow,transform] duration-200',
        index != null && !compact && 'animate-fade-in-up',
        showLift && !compact && 'card-lifting'
      )}
    >
      {/* Cover + info row */}
      <div className={cn('flex items-end gap-3', compact ? 'px-1' : 'px-1')}>
        {showOrder && book.order != null && (
          <div className="shrink-0 w-5 self-center text-center text-sm font-medium text-muted-foreground">
            {book.order}
          </div>
        )}
        <div
          className={cn(
            'shrink-0 bg-muted flex items-center justify-center overflow-hidden',
            'rounded-[4px_4px_2px_2px]',
            compact ? 'w-14 h-20' : 'w-16 h-24',
            !compact && 'shadow-[var(--shelf-shadow)]'
          )}
        >
          {hasImage ? (
            <FadeImage src={cloudFrontUrl} alt={book.title} className="w-full h-full object-cover"
              fallback={<Book className="h-6 w-6 text-muted-foreground/50" />} />
          ) : (
            <Book className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex-1 min-w-0 pb-1.5">
          <p className={cn('font-sans font-semibold text-foreground truncate', compact ? 'text-sm' : 'text-base')}>
            {book.title}
          </p>
          {authors && (
            <p className={cn('font-serif italic text-muted-foreground truncate', compact ? 'text-xs' : 'text-sm')}>
              {authors}
            </p>
          )}
          {isLent && !isSharedLibrary && (
            <span className="lent-slip mt-1 text-[10px]">
              <span className="ephemera-caps">Lent</span>
              <span className="lent-slip__div" />
              <span className="font-serif italic text-[12.5px] leading-none">{book.lentTo}</span>
            </span>
          )}
        </div>
      </div>
      {/* Walnut ledge under the cover (full width) */}
      {!compact && <div className="shelf-ledge mt-0 h-1.5 w-full rounded-[1px]" />}
    </button>
  );
};

export default BookCard;
