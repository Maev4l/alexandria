// Edited by Claude.
// Video card component for library list display
// Supports optional order number display for items within collections
// Supports long press for actions
import { useRef, useCallback, useState } from 'react';
import { Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import FadeImage from './FadeImage';

const LONG_PRESS_DURATION = 500;
const LIFT_DELAY = 150;
const STAGGER_DELAY = 50;

const VideoCard = ({ video, onClick, onLongPress, showOrder = false, compact = false, isSharedLibrary = false, isSelected = false, index }) => {
  const pressTimer = useRef(null);
  const liftTimer = useRef(null);
  const isLongPress = useRef(false);
  const [isLifting, setIsLifting] = useState(false);
  const isLent = !!video.lentTo;

  // Card is lifted during long press OR while selected (action sheet open)
  const showLift = isLifting || isSelected;

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;

    // Start lift animation early (visual feedback) - only for non-compact
    if (!compact && onLongPress) {
      liftTimer.current = setTimeout(() => {
        setIsLifting(true);
      }, LIFT_DELAY);
    }

    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setIsLifting(false); // Reset lift when action triggers
      onLongPress?.(video);
    }, LONG_PRESS_DURATION);
  }, [video, compact, onLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (liftTimer.current) {
      clearTimeout(liftTimer.current);
      liftTimer.current = null;
    }
    setIsLifting(false);
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
        'transition-[background-color,box-shadow,transform,border-color] duration-200',
        compact
          ? 'p-2 rounded-lg bg-muted/20 hover:bg-muted/40 active:bg-muted/50'
          : [
              // Glassmorphism styling for non-compact cards
              'p-3 rounded-xl',
              'bg-[var(--glass-bg)] backdrop-blur-xl',
              'border border-[var(--glass-border)]',
              'shadow-[var(--card-shadow),inset_0_1px_0_0_var(--glass-border)]',
              !showLift && 'hover:shadow-[var(--card-shadow-hover),inset_0_1px_0_0_var(--glass-border)]',
              !showLift && 'hover:border-primary/15',
              !showLift && 'active:scale-[0.99]'
            ],
        // Long press lift state (during press or while action sheet open)
        showLift && !compact && 'card-lifting',
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
            'bg-muted/50 flex items-center justify-center overflow-hidden rounded-md',
            // Subtle shadow to lift poster off the card
            !compact && 'shadow-[2px_2px_8px_rgba(0,0,0,0.3)]',
            compact ? 'w-10 h-14' : 'w-12 h-16'
          )}
        >
          {(video.picture || video.pictureUrl) ? (
            <FadeImage
              src={video.picture ? `data:image/webp;base64,${video.picture}` : video.pictureUrl}
              alt={video.title}
              className="w-full h-full object-cover"
              fallback={
                <Film className={cn(
                  'text-muted-foreground/50',
                  compact ? 'h-5 w-5' : 'h-6 w-6'
                )} />
              }
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
          <p className="text-xs text-amber-400 mt-0.5">
            to {video.lentTo}
          </p>
        )}
      </div>
    </button>
  );
};

export default VideoCard;
