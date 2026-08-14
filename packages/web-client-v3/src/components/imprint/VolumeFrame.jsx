import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { pictureSrc } from '@/lib/picture';
import VolumePlate from './VolumePlate.jsx';

const FILM = 1;
// Thumbnails are produced asynchronously; one delayed retry catches the common case without
// turning the stream into a polling loop.
const RETRY_MS = 4000;

// One ratio for every item: portrait 2:3. Book covers and TMDB posters are both that shape,
// so a single frame crops nothing and the stream keeps one row height.
//
// `hero` is the item-detail size on the inverted cover: same ratio and same spine rule, ruled
// in paper instead of ink because the ground is black there.
const VolumeFrame = ({ item, hero = false, className }) => {
  const src = pictureSrc(item);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!failed) return undefined;
    const timer = setTimeout(() => setFailed(false), RETRY_MS);
    return () => clearTimeout(timer);
  }, [failed]);

  return (
    <div
      className={cn(
        'relative shrink-0 border-2',
        hero
          ? 'h-[198px] w-[132px] border-paper bg-cover-rule'
          : 'h-[72px] w-12 border-ink bg-paper-deep',
        className,
      )}
    >
      {src && !failed && (
        <img
          src={src}
          alt=""
          role="presentation"
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      )}

      {item.type === FILM && (
        // The wrap of a keep case: where a real DVD spine falls, over the artwork's left edge.
        <span
          data-spine
          className={cn(
            'absolute inset-y-0 w-[3px]',
            hero ? 'left-[10px] bg-paper' : 'left-[6px] bg-ink',
          )}
        />
      )}

      {item.collectionId && item.order != null && (
        // Bottom-RIGHT: the spine rule owns the left edge, and a bottom-left plate would sit
        // on top of it on every film frame.
        // A 1px rule here, not 2: 2px around a 9px figure is mud. A size-dependent exception
        // to the ruled plate, not a different component. --paper ground so it reads over
        // artwork.
        <VolumePlate className="absolute bottom-0 right-0 border bg-paper px-[3px] py-0 text-[9px]">
          {String(item.order).padStart(2, '0')}
        </VolumePlate>
      )}
    </div>
  );
};

export default VolumeFrame;
