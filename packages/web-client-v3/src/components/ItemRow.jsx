import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import VolumeFrame from '@/components/imprint/VolumeFrame.jsx';
import PlateLine from '@/components/imprint/PlateLine.jsx';
import OverprintStamp from '@/components/imprint/OverprintStamp.jsx';
import RowActions from '@/components/imprint/RowActions.jsx';
import useLongPress from '@/lib/useLongPress.js';

// `marks` is a slot, and it is EMPTY in the stream — inside a library the header already says
// which library this is, and repeating it on every row is the labelled-twice rule (DESIGN.md §5).
// Search is the one surface where the library is genuinely new information, so it is the one
// caller that fills this. Keeping it a slot rather than writing a search-specific row is
// deliberate: the `--out` edge, the stamp and the read-only behaviour all live here, and a
// parallel row would drift from this one the first time any of them moved.
const ItemRow = ({ item, libraryId, onActions, marks, className }) => {
  const longPress = useLongPress(onActions ? () => onActions(item) : undefined);

  return (
    // row-skip is applied HERE and nowhere above: containment on an ancestor of a sticky
    // index letter kills position: sticky, and the letters are load-bearing wayfinding.
    <div className={cn('row-skip relative border-b border-ink', className)}>
      {/* Pseudo-element, not a border: a border would add to the box and push a lent row 4px
          out of alignment with its neighbours all the way down the stream. */}
      {item.lentTo && <span data-edge="out" className="absolute inset-y-0 left-0 w-1 bg-out" />}

      <div className="flex items-start gap-4 p-4">
        <Link
          to={`/libraries/${libraryId}/items/${item.id}`}
          className="flex min-w-0 flex-1 items-start gap-4"
          {...longPress}
        >
          <VolumeFrame item={item} />
          <span className="min-w-0 flex-1">
            {/* Content title — authored case, never uppercased. Type is no longer marked here:
                the Plate Line below is the only place book and film differ (DESIGN.md §4). */}
            <span className="block text-[17px] font-semibold leading-[1.25]">
              {item.title}
            </span>
            <PlateLine item={item} />
            {/* Reading order: what it is, who it is by, where it is filed, whether it is out —
                the same order DESIGN.md §5 gives the Detail Marks column. Whatever a caller
                puts here must be TEXT, never a link: this sits inside the row's own Link, and
                an anchor inside an anchor is invalid markup that gives one row two
                destinations. */}
            {marks}
            {item.lentTo && <OverprintStamp />}
          </span>
        </Link>

        {/* Absent, not disabled, on a shared library — which is how read-only declares itself. */}
        {onActions && (
          <RowActions
            onClick={() => onActions(item)}
            label={`Actions for ${item.title}`}
            className="self-center"
          />
        )}
      </div>
    </div>
  );
};

export default ItemRow;
