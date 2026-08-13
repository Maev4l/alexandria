import { Link } from 'react-router-dom';
import VolumePlate from '@/components/imprint/VolumePlate.jsx';
import SharedRibbon from '@/components/imprint/SharedRibbon.jsx';
import { More } from '@/components/icons';
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

      <div className="flex items-start">
        <Link
          to={`/libraries/${library.id}`}
          className="flex min-w-0 flex-1 items-start gap-4 p-4"
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
            {(sharedOutCount > 0 || isSharedWithMe) && (
              <span className="num mt-1 block text-[11px] uppercase tracking-[0.06em] text-ink-soft">
                {sharedOutCount > 0 && <SharedRibbon direction="out" count={sharedOutCount} />}
                {isSharedWithMe && (
                  <>
                    <SharedRibbon direction="in" owner={library.sharedFrom} />
                    {' · read only'}
                  </>
                )}
              </span>
            )}
          </span>
        </Link>

        {/* The visible duplicate of the long press. Absent, not disabled, when read-only. */}
        {onActions && (
          <button
            type="button"
            onClick={() => onActions(library)}
            aria-label={`Actions for ${library.name}`}
            className="flex size-12 shrink-0 items-center justify-center self-center text-ink-soft"
          >
            <More />
          </button>
        )}
      </div>
    </div>
  );
};

export default LibraryRow;
