// Edited by Claude.
// Horizontal scrolling collection card for displaying grouped items (books + videos)
// Items are displayed as cover thumbnails with horizontal scroll
import { useRef, useCallback } from 'react';
import { BookOpen, Film } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGGER_DELAY = 50; // ms per item for staggered animation
const LONG_PRESS_DURATION = 500;
const ITEM_TYPE_VIDEO = 1;

// Compact item thumbnail for horizontal scroll
const ItemThumbnail = ({ item, onClick, onLongPress, isSharedLibrary }) => {
  const pressTimer = useRef(null);
  const isLongPress = useRef(false);
  const isVideo = item.type === ITEM_TYPE_VIDEO;
  const hasImage = item.pictureUrl || item.picture;
  const isLent = !!item.lentTo;

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress?.(item);
    }, LONG_PRESS_DURATION);
  }, [item, onLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!isLongPress.current) {
      onClick?.(item);
    }
  }, [item, onClick]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (onLongPress) {
      onLongPress(item);
    }
  };

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={handleContextMenu}
      className="flex flex-col items-center gap-1 shrink-0 select-none group"
    >
      {/* Cover/poster with order badge */}
      <div className="relative">
        <div
          className={cn(
            'w-16 h-24 bg-muted flex items-center justify-center overflow-hidden',
            'transition-transform duration-150 group-active:scale-95',
            // Book: asymmetric radius (spine left), Video: rounded
            isVideo ? 'rounded-md' : 'rounded-[2px_6px_6px_2px]'
          )}
        >
          {hasImage ? (
            <img
              src={item.pictureUrl || `data:image/webp;base64,${item.picture}`}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : isVideo ? (
            <Film className="h-6 w-6 text-muted-foreground/50" />
          ) : (
            <BookOpen className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>

        {/* Lent ribbon overlay - consistent with standalone items */}
        {isLent && !isSharedLibrary && <div className="lent-ribbon" />}
      </div>

      {/* Title (truncated) */}
      <p className="w-16 text-xs text-center truncate text-muted-foreground group-hover:text-foreground transition-colors">
        {item.title}
      </p>
    </button>
  );
};

const CollectionCard = ({ name, items, onItemClick, onItemLongPress, isSharedLibrary = false, index }) => {
  const itemCount = items.length;

  // Staggered animation style
  const animationStyle = index != null
    ? { animationDelay: `${index * STAGGER_DELAY}ms` }
    : undefined;

  return (
    <div
      style={animationStyle}
      className={cn(
        'rounded-lg border border-border bg-card overflow-hidden',
        'shadow-[var(--card-shadow)]',
        // Staggered fade-in animation
        index != null && 'animate-fade-in-up'
      )}
    >
      {/* Collection header - muted background for contrast */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-muted/50 border-b border-border/50">
        <h3 className="font-medium">{name}</h3>
        <span className="text-sm text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Horizontal scrolling items - card background */}
      <div className="relative bg-card">
        {/* Scroll container */}
        <div
          className={cn(
            'flex gap-3 px-3 pt-3 pb-3 overflow-x-auto',
            // Hide scrollbar but keep functionality
            'scrollbar-none',
            // Smooth scroll on iOS
            '-webkit-overflow-scrolling-touch'
          )}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {items.map((item) => (
            <ItemThumbnail
              key={item.id}
              item={item}
              onClick={onItemClick}
              onLongPress={onItemLongPress}
              isSharedLibrary={isSharedLibrary}
            />
          ))}
        </div>

        {/* Right fade gradient to indicate more content */}
        {itemCount > 4 && (
          <div className="absolute right-0 top-3 bottom-3 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
};

export default CollectionCard;
