import ItemRow from '@/components/ItemRow.jsx';
import VolumePlate from './VolumePlate.jsx';
import RowActions from './RowActions.jsx';

// A board files alphabetically under the COLLECTION's name while its members run in `order`,
// so a board under "S" can legitimately open with "Aliens". An earlier draft printed a
// SERIES ORDER caption to explain that — but every member already carries a numbered plate,
// and a numbered sequence needs no caption saying it runs in sequence. That was one fact
// labelled twice, so the caption is gone.
//
// CONTINUES survives as the one label that earns its place: it is the only thing on screen
// stating that this board's members did not all arrive together. A member plate reading `07`
// does not prove it — orders run 1-1000 and a collection need not start at 1 — so an orphaned
// continuation page (no predecessor board already on screen to merge into) would otherwise
// look like a duplicate of a board the reader already saw.
//
// Deliberately NOT given row-skip: boards are variable-height, and a wrong intrinsic size
// drifts the scroll position when a continuation page merges members into one mid-scroll.
const CollectionBoard = ({ board, libraryId, onItemActions, onBoardActions }) => (
  <div data-board={board.id} className="m-4 border-[3px] border-ink">
    <div className="flex items-center justify-between gap-2 border-b-2 border-ink p-2">
      <div className="min-w-0">
        {/* Content name — authored case. */}
        <div className="truncate text-[17px] font-bold">{board.title}</div>
        {board.partial && (
          <span className="mt-[2px] block text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
            Continues
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {/* Bare figure, no prefix: `⌗` isn't in Archivo at all (confirmed by cmap, not just
            missing from our subset), so it had been rendering in a browser-substituted font.
            The container already says what the number is — this plate belongs to the
            collection, so it needs no caption of its own. */}
        <VolumePlate aria-label={`${board.itemCount} items in this collection`}>
          {board.itemCount}
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
