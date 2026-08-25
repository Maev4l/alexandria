import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { pictureSrc } from '@/lib/picture';
import VolumePlate from './VolumePlate.jsx';

// Thumbnails are produced asynchronously; one delayed retry catches the common case without
// turning the stream into a polling loop.
const RETRY_MS = 4000;

const SIZES = {
  row: 'h-[72px] w-12 border-ink',
  candidate: 'h-[132px] w-[88px] border-ink',
  hero: 'h-[198px] w-[132px] border-paper',
};

// One ratio for every item: portrait 2:3. Book covers and TMDB posters are both that shape,
// so a single frame crops nothing and the stream keeps one row height.
//
// Type is not marked on the frame (DESIGN.md §4, "The frame, and how books and films differ"):
// a book and a film take the IDENTICAL frame now. The Plate Line — AUTHOR vs DIRECTOR · YEAR —
// is the only place they differ, and it already survives with no artwork at all.
//
// THREE SIZES, one ratio. `row` (48x72) is the browse stream, where a reader is scanning a
// thousand titles and the words do the work. `hero` (132x198) is item detail on the inverted
// cover — ruled in paper rather than ink, because the ground is black there. `candidate`
// (88x132) sits between them, on the detection-results screens, and it exists because ui-v3.md
// says of that one screen that "the picture is what decides the match": a candidate list is the
// moment a reader compares editions, and choosing the wrong one writes a record they cannot
// detect as wrong later. It shipped at the row's 48x72 — smaller than a stream row's job
// required, on the screen with the most vertical room to spare (measured: 284px unused at 844).
//
// `onFailedChange` surfaces the `failed` state below to whoever asked for it, without this
// component taking on any opinion about what a caller does with it. Today that is only the
// item-detail hero, which uses the signal to offer a manual "Fetch cover" repair — the control
// lives on the PAGE (ItemDetail.jsx), not here, so ItemRow (every row in the browse stream) can
// keep calling `<VolumeFrame item={item} />` with no `hero` and no `onFailedChange` and see
// nothing different at all: an optional prop nobody passes is a no-op, not a per-row action.
const VolumeFrame = ({ item, size = 'row', className, onFailedChange }) => {
  const src = pictureSrc(item);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!failed) return undefined;
    const timer = setTimeout(() => setFailed(false), RETRY_MS);
    return () => clearTimeout(timer);
  }, [failed]);

  useEffect(() => {
    onFailedChange?.(failed);
  }, [failed, onFailedChange]);

  return (
    <div
      className={cn(
        'relative shrink-0 border-2',
        // Unfilled, both surfaces (round 5 critique #1): "ruled" means the rule and nothing
        // else. The hero used to fill with `--cover-rule` at full strength — 1.73:1 against
        // `--ink`, a mid-grey slab in the largest frame in the app — and since `picture` is
        // absent for most items, that slab was the DEFAULT appearance of the peak screen: a
        // filled rectangle where artwork belongs reads as a failed image, which §6 forbids. It
        // also spent a token declared "hairline separators, structure only" as a ground. The
        // non-hero frame's `bg-paper-deep` read as harmless (~1.05:1, near-invisible against
        // `--paper`) but was still a fill where the rule alone was already doing the job — so
        // both are unfilled here, not just the one that looked wrong.
        SIZES[size],
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

      {item.collectionId && item.order != null && (
        // Bottom-right: unchanged from when a film's spine rule owned the left edge, and kept
        // there now that the spine is gone — moving it would be a second, unasked-for visual
        // change. A 1px rule here, not 2: 2px around a figure this small is mud. A size-dependent
        // exception to the ruled plate, not a different component. --paper ground so it reads
        // over artwork.
        //
        // 10px, not the 9 this shipped with. 9 was the only sub-10px size in the system and the
        // only small role at weight 400 rather than 800, and no space argument ever required it:
        // two digits of Chivo Mono at 10px is 12px of advance plus 6px of padding — 18px inside a
        // 48px frame, and 24px at three digits. A critique called it the clearest finding of its
        // run; the comp was checked, 9px was found declared there, and it was recorded as
        // documentation drift with the code deemed right. That answered whose fault it was and
        // silently dropped whether 9 was correct. Both were wrong together, which is precisely
        // the case a provenance check cannot see. DESIGN.md §3 now sets the scale floor at 10.
        <VolumePlate className="absolute bottom-0 right-0 border bg-paper px-[3px] py-0 text-[10px]">
          {String(item.order).padStart(2, '0')}
        </VolumePlate>
      )}
    </div>
  );
};

export default VolumeFrame;
