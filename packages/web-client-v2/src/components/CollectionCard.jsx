// Edited by Claude.
// Horizontal scrolling collection card for displaying grouped items (books + videos)
// Items are displayed as cover thumbnails with horizontal scroll
// Uses itemCount (denormalized from DynamoDB) to determine if collection is empty
import { useRef, useCallback } from 'react';
import { BookOpen, Film, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import FadeImage from './FadeImage';

const STAGGER_DELAY = 50; // ms per card for staggered animation
const ITEM_UNFOLD_DELAY = 80; // ms per item within collection for unfolding effect
const LONG_PRESS_DURATION = 500;
const ITEM_TYPE_VIDEO = 1;

// Compact item thumbnail for horizontal scroll with unfold animation
const ItemThumbnail = ({ item, onClick, onLongPress, isSharedLibrary, unfoldIndex }) => {
  const pressTimer = useRef(null);
  const isLongPress = useRef(false);
  const isVideo = item.type === ITEM_TYPE_VIDEO;
  // Prioritize base64 picture over pictureUrl
  const hasImage = item.picture || item.pictureUrl;
  const isLent = !!item.lentTo;

  // Staggered unfold animation style
  const unfoldStyle = unfoldIndex != null
    ? { animationDelay: `${unfoldIndex * ITEM_UNFOLD_DELAY}ms` }
    : undefined;

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
      style={unfoldStyle}
      className={cn(
        'flex flex-col items-center gap-1 shrink-0 select-none group',
        // Unfold animation - items slide in from left with fade
        unfoldIndex != null && 'animate-unfold-item'
      )}
    >
      {/* Cover/poster with order badge */}
      <div className="relative">
        <div
          className={cn(
            'w-16 h-24 bg-muted/50 flex items-center justify-center overflow-hidden',
            'transition-transform duration-150 group-active:scale-95',
            // Subtle shadow to lift cover
            'shadow-[2px_2px_8px_rgba(0,0,0,0.3)]',
            // Book: asymmetric radius (spine left), Video: rounded
            isVideo ? 'rounded-md' : 'rounded-[2px_6px_6px_2px]'
          )}
        >
          {hasImage ? (
            <FadeImage
              src={item.picture ? `data:image/webp;base64,${item.picture}` : item.pictureUrl}
              alt={item.title}
              className="w-full h-full object-cover"
              fallback={
                isVideo
                  ? <Film className="h-6 w-6 text-muted-foreground/50" />
                  : <BookOpen className="h-6 w-6 text-muted-foreground/50" />
              }
            />
          ) : isVideo ? (
            <Film className="h-6 w-6 text-muted-foreground/50" />
          ) : (
            <BookOpen className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>

        {/* Subtle order indicator - bottom right corner */}
        {item.order != null && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-background border border-muted-foreground text-[10px] font-semibold text-foreground flex items-center justify-center shadow-sm">
            {item.order}
          </div>
        )}

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

const CollectionCard = ({ collection, items, itemCount: totalItemCount, onItemClick, onItemLongPress, onMorePress, isSharedLibrary = false, index }) => {
  // Use totalItemCount from DynamoDB if provided, fallback to items.length
  const itemCount = totalItemCount ?? items.length;
  const loadedItemCount = items.length;
  const name = collection?.name || 'Unknown';
  // Number of skeleton placeholders to show for items not yet loaded
  const pendingItemCount = Math.max(0, itemCount - loadedItemCount);

  // Staggered animation style
  const animationStyle = index != null
    ? { animationDelay: `${index * STAGGER_DELAY}ms` }
    : undefined;

  const handleMoreClick = useCallback((e) => {
    e.stopPropagation();
    onMorePress?.(collection);
  }, [collection, onMorePress]);

  return (
    <div
      style={animationStyle}
      className={cn(
        // Glassmorphism styling for collection card
        'rounded-xl overflow-hidden',
        'bg-[var(--glass-bg)] backdrop-blur-xl',
        'border border-[var(--glass-border)]',
        'shadow-[var(--card-shadow),inset_0_1px_0_0_var(--glass-border)]',
        // Staggered fade-in animation
        index != null && 'animate-fade-in-up'
      )}
    >
      {/* Collection header - subtle glass panel */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-primary/5 border-b border-[var(--glass-border)]">
        <div className="flex flex-col">
          <h3 className="font-medium">{name}</h3>
          <span className="text-xs text-muted-foreground">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>
        {/* More button - only for owned libraries */}
        {onMorePress && !isSharedLibrary && (
          <button
            onClick={handleMoreClick}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors"
            aria-label={`More options for ${name}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Horizontal scrolling items - transparent to show glass */}
      <div className="relative">
        {itemCount === 0 ? (
          // Empty state - only show "Tap ••• to add items" when truly empty
          <div className="flex items-center justify-center px-3 py-6 text-sm text-muted-foreground">
            {isSharedLibrary ? 'No items' : 'Tap ••• to add items'}
          </div>
        ) : (
          <>
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
              {/* Loaded items with staggered unfold animation */}
              {items.map((item, idx) => (
                <ItemThumbnail
                  key={item.id}
                  item={item}
                  onClick={onItemClick}
                  onLongPress={onItemLongPress}
                  isSharedLibrary={isSharedLibrary}
                  unfoldIndex={idx}
                />
              ))}
              {/* Skeleton placeholders for items not yet loaded (pagination) */}
              {pendingItemCount > 0 && Array.from({ length: pendingItemCount }).map((_, i) => (
                <div key={`skeleton-${i}`} className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-16 h-24 bg-muted rounded-md animate-pulse" />
                  <div className="w-12 h-3 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>

            {/* Right fade gradient to indicate more content */}
            {itemCount > 4 && (
              <div className="absolute right-0 top-3 bottom-3 w-8 bg-gradient-to-l from-[var(--glass-bg)] to-transparent pointer-events-none" />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CollectionCard;
