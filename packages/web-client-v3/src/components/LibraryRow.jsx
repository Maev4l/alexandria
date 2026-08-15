import { Link } from 'react-router-dom';
import VolumePlate from '@/components/imprint/VolumePlate.jsx';
import RowActions from '@/components/imprint/RowActions.jsx';
import SharedRibbon from '@/components/imprint/SharedRibbon.jsx';
import useLongPress from '@/lib/useLongPress.js';

const LibraryRow = ({ library, onActions }) => {
  const sharedOutCount = library.sharedTo?.length ?? 0;
  const isSharedWithMe = Boolean(library.sharedFrom);
  const longPress = useLongPress(onActions ? () => onActions(library) : undefined);

  return (
    <div className="relative border-b-2 border-ink">
      {/* Absolutely positioned, never a border: a border would add to the box and push this
          row 4px right of its unmarked neighbours all the way down the stream. */}
      {(sharedOutCount > 0 || isSharedWithMe) && (
        <span data-edge="shared" className="absolute inset-y-0 left-0 w-1 bg-shared" />
      )}

      {/* 8 divisions bare, 10 with a sub-line — both whole numbers of the division. */}
      <div className="flex min-h-16 items-start gap-4 p-4">
        <Link
          to={`/libraries/${library.id}`}
          className="flex min-w-0 flex-1 items-start gap-4"
          {...longPress}
        >
          {/* Fixed 56px column so a 3-digit and a 2-digit count leave titles on one edge. */}
          <VolumePlate className="min-w-14 text-center" aria-label={`${library.totalItems} volumes`}>
            {library.totalItems}
          </VolumePlate>
          <span className="min-w-0 flex-1">
            {/* Content title — authored case, never uppercased. */}
            <span className="block text-[22px] font-bold leading-[1.15]">{library.name}</span>
            {/* The sub-line carries sharing and nothing else. The count is already in the
                plate, so naming it here too would label the same fact twice — which is why
                the row falls silent when a library is neither shared out nor shared in. */}
            {/* Routed through the SAME vocabulary component DetailMarks already uses, rather
                than a hand-rolled tag: this used to set the whole "Shared · N" string — and,
                worse, the owner's email address — in `.num` (Chivo Mono), which DESIGN.md §3
                reserves for numerals. Mono is for the count, not the word or the address. The
                `caps` wrapper supplies the same 0.16em tracking DetailMarks' caller already
                uses, so one component now renders at one tracking value everywhere. */}
            {sharedOutCount > 0 && (
              <span className="caps mt-1 block text-[11px] font-bold tracking-[0.16em]">
                <SharedRibbon direction="out" count={sharedOutCount} />
              </span>
            )}
            {isSharedWithMe && (
              <span className="caps mt-1 block text-[11px] font-bold tracking-[0.16em]">
                <SharedRibbon direction="in" owner={library.sharedFrom} />
              </span>
            )}
          </span>
        </Link>

        {/* The visible duplicate of the long press. Its ABSENCE on a shared-with-me row is
            how read-only declares itself: the action is gone, not disabled. */}
        {onActions && (
          <RowActions
            onClick={() => onActions(library)}
            label={`Actions for ${library.name}`}
            className="self-center"
          />
        )}
      </div>
    </div>
  );
};

export default LibraryRow;
