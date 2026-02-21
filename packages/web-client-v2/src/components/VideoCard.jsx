// Edited by Claude.
// Video card component for library list display
// Supports optional order number display for items within collections
// Supports long press for actions
import { useRef, useCallback } from 'react';
import { Film } from 'lucide-react';
import { cn } from '@/lib/utils';

const LONG_PRESS_DURATION = 500;
const STAGGER_DELAY = 50; // ms per item for staggered animation

const VideoCard = ({ video, onClick, onLongPress, showOrder = false, compact = false, isSharedLibrary = false, index }) => {
  const pressTimer = useRef(null);
  const isLongPress = useRef(false);
  const isLent = !!video.lentTo;

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress?.(video);
    }, LONG_PRESS_DURATION);
  }, [video, onLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!isLongPress.current) {
      onClick?.(video);
    }
  }, [video, onClick]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (onLongPress) {
      onLongPress(video);
    }
  };

  // Build metadata line (directors, year)
  const metaParts = [];
  if (video.directors?.length > 0) {
    metaParts.push(video.directors[0]); // First director
  }
  if (video.releaseYear) {
    metaParts.push(video.releaseYear);
  }
  const metaLine = metaParts.join(' · ');

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
      onContextMenu={handleContextMenu}
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
      {showOrder && video.order != null && (
        <div className="shrink-0 w-6 flex items-center justify-center">
          <span className="text-sm font-medium text-muted-foreground">
            {video.order}
          </span>
        </div>
      )}

      {/* Poster */}
      <div className="relative shrink-0">
        <div
          className={cn(
            'bg-muted flex items-center justify-center overflow-hidden rounded-md',
            compact ? 'w-10 h-14' : 'w-12 h-16'
          )}
        >
          {video.pictureUrl ? (
            <img
              src={video.pictureUrl}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Film className={cn(
              'text-muted-foreground/50',
              compact ? 'h-5 w-5' : 'h-6 w-6'
            )} />
          )}
        </div>
        {/* Lent ribbon overlay - same as BookCard */}
        {isLent && !compact && <div className="lent-ribbon" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className={cn('font-medium truncate', compact && 'text-sm')}>
          {video.title}
        </p>
        {metaLine && (
          <p className={cn(
            'text-muted-foreground truncate',
            compact ? 'text-xs' : 'text-sm'
          )}>
            {metaLine}
          </p>
        )}
        {/* Show lent-to name as text - same style as BookCard */}
        {isLent && !isSharedLibrary && (
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
            to {video.lentTo}
          </p>
        )}
      </div>
    </button>
  );
};

export default VideoCard;
