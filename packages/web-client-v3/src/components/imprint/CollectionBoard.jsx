import ItemRow from '@/components/ItemRow.jsx';
import VolumePlate from './VolumePlate.jsx';
import RowActions from './RowActions.jsx';

// A board files alphabetically under the COLLECTION's name while its members run in `order`,
// so a board under "S" can legitimately open with "Aliens". The SERIES ORDER label is what
// stops correct behaviour reading as a sorting bug.
//
// Deliberately NOT given row-skip: boards are variable-height, and a wrong intrinsic size
// drifts the scroll position when a continuation page merges members into one mid-scroll.
const CollectionBoard = ({ board, libraryId, onItemActions, onBoardActions }) => (
  <div className="m-4 border-[3px] border-ink">
    <div className="flex items-center justify-between gap-2 border-b-2 border-ink p-2">
      <div className="min-w-0">
        {/* Content name — authored case. */}
        <div className="truncate text-[17px] font-bold">{board.title}</div>
        <span className="mt-[2px] block text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
          {board.partial ? 'Series order · continues' : 'Series order'}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <VolumePlate aria-label={`${board.itemCount} items in this collection`}>
          ⌗ {board.itemCount}
        </VolumePlate>
        {onBoardActions && (
          <RowActions
            onClick={() => onBoardActions(board)}
            label={`Actions for the collection ${board.title}`}
          />
        )}
      </div>
    </div>

    {/* Members inset by one division. */}
    <div className="pl-2">
      {(board.items ?? []).map((item, index) => (
        <ItemRow
          key={item.id}
          item={item}
          libraryId={libraryId}
          onActions={onItemActions}
          className={index === board.items.length - 1 ? 'border-b-0' : undefined}
        />
      ))}
    </div>
  </div>
);

export default CollectionBoard;
