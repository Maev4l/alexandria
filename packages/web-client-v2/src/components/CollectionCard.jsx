// Edited by Claude.
// Collection — a wide wooden board. Members are covers standing on the shelf,
// scrolling horizontally; pending members render as hatched ghost covers.
import { useRef, useCallback } from 'react';
import { Book, Film, MoreHorizontal, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import FadeImage from './FadeImage';

const STAGGER_DELAY = 50;
const ITEM_UNFOLD_DELAY = 80;
const LONG_PRESS_DURATION = 500;
const ITEM_TYPE_VIDEO = 1;

const ItemThumbnail = ({ item, onClick, onLongPress, isSharedLibrary, unfoldIndex }) => {
  const pressTimer = useRef(null);
  const isLongPress = useRef(false);
  const isVideo = item.type === ITEM_TYPE_VIDEO;
  const cloudFrontUrl = item.picture
    ? `${item.picture}?v=${item.updatedAt ? new Date(item.updatedAt).getTime() : '0'}`
    : null;
  const hasImage = !!cloudFrontUrl;
  const isLent = !!item.lentTo;
  const unfoldStyle = unfoldIndex != null ? { animationDelay: `${unfoldIndex * ITEM_UNFOLD_DELAY}ms` } : undefined;

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => { isLongPress.current = true; onLongPress?.(item); }, LONG_PRESS_DURATION);
  }, [item, onLongPress]);
  const handleTouchEnd = useCallback(() => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }, []);
  const handleClick = useCallback(() => { if (!isLongPress.current) onClick?.(item); }, [item, onClick]);
  const handleContextMenu = (e) => { e.preventDefault(); if (onLongPress) onLongPress(item); };

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={handleContextMenu}
      style={unfoldStyle}
      aria-label={`${item.title}, ${isVideo ? 'film' : 'book'}`}
      className={cn('flex flex-col items-center gap-1 shrink-0 select-none group', unfoldIndex != null && 'animate-unfold-item')}
    >
      <div className="relative">
        <div className={cn(
          'w-16 h-24 bg-muted flex items-center justify-center overflow-hidden',
          'transition-transform duration-150 group-active:scale-95 shadow-[var(--shelf-shadow)]',
          'rounded-[4px]'
        )}>
          {hasImage ? (
            <FadeImage src={cloudFrontUrl} alt={item.title} className="w-full h-full object-cover"
              fallback={isVideo ? <Film className="h-6 w-6 text-muted-foreground/50" /> : <Book className="h-6 w-6 text-muted-foreground/50" />} />
          ) : isVideo ? (
            <Film className="h-6 w-6 text-muted-foreground/50" />
          ) : (
            <Book className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>
        {item.order != null && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-card border border-border text-[10px] font-semibold text-foreground flex items-center justify-center shadow-sm">
            {item.order}
          </div>
        )}
        {isLent && !isSharedLibrary && (
          <span className="lent-tab ephemera-caps text-[8.5px] leading-none">Lent</span>
        )}
      </div>
      {/* Title under the cover — caption lifts the cover so it "floats" above the shelf */}
      <p className="w-16 text-xs text-center truncate font-serif italic text-muted-foreground group-hover:text-foreground transition-colors">
        {item.title}
      </p>
    </button>
  );
};

const CollectionCard = ({ collection, items, itemCount: totalItemCount, onItemClick, onItemLongPress, onMorePress, isSharedLibrary = false, index }) => {
  const itemCount = totalItemCount ?? items.length;
  const loadedItemCount = items.length;
  const name = collection?.name || 'Unknown';
  const pendingItemCount = Math.max(0, itemCount - loadedItemCount);
  const isLoading = totalItemCount > 0 && loadedItemCount === 0;
  const animationStyle = index != null ? { animationDelay: `${index * STAGGER_DELAY}ms` } : undefined;

  const handleMoreClick = useCallback((e) => { e.stopPropagation(); onMorePress?.(collection); }, [collection, onMorePress]);

  return (
    <div style={animationStyle} className={cn('rounded-2xl overflow-hidden bg-card shadow-[var(--card-shadow)]', index != null && 'animate-fade-in-up')}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex flex-col">
          <h3 className="font-sans font-semibold text-foreground">{name}</h3>
          <span className="font-serif italic text-xs text-muted-foreground">
            {loadedItemCount < itemCount ? `${loadedItemCount} of ${itemCount}` : `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-0.5 rounded-md bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary">
            <Hash className="h-3.5 w-3.5" />{itemCount}
          </span>
          {onMorePress && !isSharedLibrary && (
            <button onClick={handleMoreClick}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label={`More options for ${name}`}>
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Members standing on a wide wooden shelf */}
      <div className="relative">
        {itemCount === 0 && !isLoading ? (
          <div className="px-3 pb-3 font-serif italic text-sm text-muted-foreground">
            {isSharedLibrary ? 'No items' : 'Tap ••• to add items'}
          </div>
        ) : (
          <>
            <div className="flex gap-3 px-3 pt-1 pb-2 overflow-x-auto scrollbar-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {items.map((item, idx) => (
                <ItemThumbnail key={item.id} item={item} onClick={onItemClick} onLongPress={onItemLongPress}
                  isSharedLibrary={isSharedLibrary} unfoldIndex={idx} />
              ))}
              {pendingItemCount > 0 && Array.from({ length: pendingItemCount }).map((_, i) => (
                <div key={`ghost-${i}`} className="flex flex-col items-center gap-1 shrink-0">
                  <div className="ghost-cover w-16 h-24 rounded-[4px]" />
                  <div className="ghost-cover w-12 h-3 rounded" />
                </div>
              ))}
            </div>
            {/* The walnut board the covers stand on — full width of the card */}
            <div className="shelf-ledge h-2 w-full" />
            {(itemCount > 4 || pendingItemCount > 0) && (
              <div className="absolute right-0 top-1 bottom-4 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none" />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CollectionCard;
