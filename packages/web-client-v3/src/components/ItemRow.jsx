import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import VolumeFrame from '@/components/imprint/VolumeFrame.jsx';
import TypeTag from '@/components/imprint/TypeTag.jsx';
import PlateLine from '@/components/imprint/PlateLine.jsx';
import OverprintStamp from '@/components/imprint/OverprintStamp.jsx';
import RowActions from '@/components/imprint/RowActions.jsx';
import useLongPress from '@/lib/useLongPress.js';

const ItemRow = ({ item, libraryId, onActions, className }) => {
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
            <TypeTag type={item.type} />
            {/* Content title — authored case, never uppercased. */}
            <span className="mt-[2px] block text-[17px] font-semibold leading-[1.25]">
              {item.title}
            </span>
            <PlateLine item={item} />
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
