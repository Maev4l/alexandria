// Edited by Claude.
// Library row, "Shelf section" style: a full-width cream card sitting on a walnut
// ledge, with a deterministic spine cluster (the library's visual identity), its
// name, and an item count. Sharing is signalled in deep green:
//   - shared TO others (your library)  -> top-right "Shared · N" pill
//   - shared FROM another user (with me) -> left-edge spine-tab + "borrowed from <owner>"
// Supports long press for actions on owned libraries.
import { useRef, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import SpineCluster from './SpineCluster';

const LONG_PRESS_DURATION = 500;
const LIFT_DELAY = 150;
const STAGGER_DELAY = 50;

const LibraryCard = ({ library, onClick, onLongPress, isSelected = false, index }) => {
  const isSharedFromOther = !!library.sharedFrom; // shared WITH me
  const sharedToCount = library.sharedTo?.length || 0; // I shared this OUT
  const isSharedToOthers = sharedToCount > 0;
  const owner = library.sharedFrom ? library.sharedFrom.split('@')[0] : null;

  const pressTimer = useRef(null);
  const liftTimer = useRef(null);
  const isLongPress = useRef(false);
  const [isLifting, setIsLifting] = useState(false);
  const showLift = isLifting || isSelected;

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    if (!isSharedFromOther && onLongPress) {
      liftTimer.current = setTimeout(() => setIsLifting(true), LIFT_DELAY);
    }
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setIsLifting(false);
      if (!isSharedFromOther && onLongPress) onLongPress(library);
    }, LONG_PRESS_DURATION);
  }, [library, isSharedFromOther, onLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    if (liftTimer.current) { clearTimeout(liftTimer.current); liftTimer.current = null; }
    setIsLifting(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!isLongPress.current) onClick?.(library);
  }, [library, onClick]);

  const animationStyle = index != null ? { animationDelay: `${index * STAGGER_DELAY}ms` } : undefined;

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(e) => {
        if (!isSharedFromOther && onLongPress) { e.preventDefault(); onLongPress(library); }
      }}
      style={animationStyle}
      className={cn(
        'relative flex w-full flex-col overflow-hidden rounded-2xl bg-card text-left select-none',
        'shadow-[var(--card-shadow)] transition-[box-shadow,transform] duration-200',
        !showLift && 'hover:shadow-[var(--card-shadow-hover)] active:scale-[0.99]',
        showLift && 'card-lifting',
        index != null && 'animate-fade-in-up'
      )}
    >
      {/* Left-edge green ribbon marks a library shared WITH me */}
      {isSharedFromOther && <span className="share-ribbon" />}

      {/* Hollow green stamp marks a library I shared OUT to others */}
      {isSharedToOthers && !isSharedFromOther && (
        <span className="share-stamp ephemera-caps absolute top-2.5 right-2.5 text-[9.5px]">
          Shared · {sharedToCount}
        </span>
      )}

      {/* Content sitting on the shelf */}
      <div className="flex items-end gap-3 px-4 pt-3 pb-2">
        <SpineCluster name={library.name} muted={isSharedFromOther} />
        <div className="flex-1 min-w-0 pb-0.5">
          <p className="font-sans font-semibold text-base text-foreground truncate">{library.name}</p>
          {isSharedFromOther ? (
            <>
              <p className="ephemera-caps text-[9.5px] text-secondary">Lent to you</p>
              <p className="font-serif italic text-sm text-secondary/90 truncate">from {owner}&apos;s library</p>
            </>
          ) : (
            <p className="font-serif italic text-sm text-muted-foreground truncate">
              {library.totalItems} {library.totalItems === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>
      </div>

      {/* Full-width walnut ledge */}
      <div className="shelf-ledge h-1.5 w-full" />
    </button>
  );
};

export default LibraryCard;
