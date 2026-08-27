import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { pictureSrc } from '@/lib/picture';
import VolumePlate from './VolumePlate.jsx';

// Thumbnails are produced asynchronously, so a frame that failed 4s ago may well succeed now.
// ONE retry, then the ruled empty frame — which is what the empty frame is for. The bound is the
// point: without something counting attempts, clearing the flag remounts the <img>, that image's
// next failure sets the flag again, and the timer is armed once more. A merely-late thumbnail
// resolves on the second attempt, which is the case this was written for; a permanently missing
// one used to re-request every 4s for as long as the row was mounted, on every such row of a
// thirty-row page. The thumbnail URL is synthesised from a template without checking storage, so
// an address that 404s is the common case rather than the rare one.
//
// The single retry RE-ARMS when `src` changes, and that is deliberate rather than incidental. The
// address carries ?v={updatedAt}, so a changed src means the item was genuinely written to: a new
// subject, not a repeat of the one that failed. It is also what item detail's "Fetch cover" repair
// depends on — that write moves `updatedAt`, so the repaired cover is tried afresh instead of
// inheriting a verdict reached about a different address.
export const RETRY_MS = 4000;

const SIZES = {
  row: 'h-[72px] w-12 border-ink',
  candidate: 'h-[132px] w-[88px] border-ink',
  hero: 'h-[198px] w-[132px] border-paper',
};

// One ratio for every item: portrait 2:3. Book covers and TMDB posters are both that shape,
// so a single frame crops nothing and the stream keeps one row height.
//
// Type is not marked on the frame:
// a book and a film take the IDENTICAL frame now. The Plate Line — AUTHOR vs DIRECTOR · YEAR —
// is the only place they differ, and it already survives with no artwork at all.
//
// THREE SIZES, one ratio. `row` (48x72) is the browse stream, where a reader is scanning a
// thousand titles and the words do the work. `hero` (132x198) is item detail on the inverted
// cover — ruled in paper rather than ink, because the ground is black there. `candidate`
// (88x132) sits between them, on the detection-results screens, and it exists because on that
// one screen "the picture is what decides the match": a candidate list is the
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
  const [retried, setRetried] = useState(false);
  const [attemptedSrc, setAttemptedSrc] = useState(src);

  // Reset during render rather than in an effect: an effect would let the frame commit one paint
  // holding the previous address's verdict — empty, with the repair control still offered —
  // before correcting itself. This is the derived-from-props adjustment React re-renders
  // immediately, so nothing stale ever reaches the screen.
  if (attemptedSrc !== src) {
    setAttemptedSrc(src);
    setFailed(false);
    setRetried(false);
  }

  // Armed only while a retry is still owed. Once it is spent, a further failure leaves the flag
  // set and nothing rearms — so the flag SETTLES true rather than flickering on a clock, which is
  // what keeps item detail's "Fetch cover" control stably on screen instead of appearing and
  // vanishing every four seconds in front of the reader.
  useEffect(() => {
    if (!failed || retried) return undefined;
    const timer = setTimeout(() => {
      setRetried(true);
      setFailed(false);
    }, RETRY_MS);
    return () => clearTimeout(timer);
  }, [failed, retried]);

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
        // filled rectangle where artwork belongs reads as a failed image, which the state grammar
        // forbids outright. It
        // also spent the cover's hairline tone at FULL strength as a large ground — which is a
        // different thing from the quarter-strength fill the state grammar gives a skeleton bar,
        // where what stands in is a line of text and not artwork. The
        // non-hero frame's `bg-paper-deep` read as harmless (1.09:1, near-invisible against
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
        // the case a provenance check cannot see. The type scale's floor is now 10.
        <VolumePlate className="absolute bottom-0 right-0 border bg-paper px-[3px] py-0 text-[10px]">
          {String(item.order).padStart(2, '0')}
        </VolumePlate>
      )}
    </div>
  );
};

export default VolumeFrame;
