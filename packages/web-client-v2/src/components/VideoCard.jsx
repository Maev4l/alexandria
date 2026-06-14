// Edited by Claude.
// Video standalone card — poster standing on a full-width walnut ledge.
// Presentation-only: navigation/edit routing lives in the parent (keyed on item.type).
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

  const cloudFrontUrl = video.picture
    ? `${video.picture}?v=${video.updatedAt ? new Date(video.updatedAt).getTime() : '0'}`
    : null;
  const hasImage = !!cloudFrontUrl;
  const showLift = isLifting || isSelected;

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    if (!compact && onLongPress) {
      liftTimer.current = setTimeout(() => setIsLifting(true), LIFT_DELAY);
    }
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setIsLifting(false);
      onLongPress?.(video);
    }, LONG_PRESS_DURATION);
  }, [video, compact, onLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    if (liftTimer.current) { clearTimeout(liftTimer.current); liftTimer.current = null; }
    setIsLifting(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!isLongPress.current) onClick?.(video);
  }, [video, onClick]);

  const handleContextMenu = (e) => { e.preventDefault(); if (onLongPress) onLongPress(video); };

  const metaParts = [];
  if (video.directors?.length > 0) metaParts.push(`dir. ${video.directors[0]}`);
  if (video.releaseYear) metaParts.push(video.releaseYear);
  const metaLine = metaParts.join(' · ');

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
      aria-label={`${video.title}, film`}
      className={cn(
        'w-full text-left select-none',
        'transition-[box-shadow,transform] duration-200',
        index != null && !compact && 'animate-fade-in-up',
        showLift && !compact && 'card-lifting'
      )}
    >
      <div className="flex items-end gap-3 px-1">
        {showOrder && video.order != null && (
          <div className="shrink-0 w-5 self-center text-center text-sm font-medium text-muted-foreground">
            {video.order}
          </div>
        )}
        <div
          className={cn(
            'shrink-0 bg-muted flex items-center justify-center overflow-hidden rounded-[4px_4px_2px_2px]',
            compact ? 'w-14 h-20' : 'w-16 h-24',
            !compact && 'shadow-[var(--shelf-shadow)]'
          )}
        >
          {hasImage ? (
            <FadeImage src={cloudFrontUrl} alt={video.title} className="w-full h-full object-cover"
              fallback={<Film className="h-6 w-6 text-muted-foreground/50" />} />
          ) : (
            <Film className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex-1 min-w-0 pb-1.5">
          <p className={cn('font-sans font-semibold text-foreground truncate', compact ? 'text-sm' : 'text-base')}>
            {video.title}
          </p>
          {metaLine && (
            <p className={cn('font-serif italic text-muted-foreground truncate', compact ? 'text-xs' : 'text-sm')}>
              {metaLine}
            </p>
          )}
          {isLent && !isSharedLibrary && (
            <span className="lent-slip mt-1 text-[10px]">
              <span className="ephemera-caps">Lent</span>
              <span className="lent-slip__div" />
              <span className="font-serif italic text-[12.5px] leading-none">{video.lentTo}</span>
            </span>
          )}
        </div>
      </div>
      {!compact && <div className="shelf-ledge mt-0 h-1.5 w-full rounded-[1px]" />}
    </button>
  );
};

export default VideoCard;
