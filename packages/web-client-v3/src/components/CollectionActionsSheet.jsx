import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sheet from '@/components/imprint/Sheet.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import AddItemSheet from '@/components/AddItemSheet.jsx';
import { collectionsApi } from '@/api';
import { useToast } from '@/state/ToastContext.jsx';

const CollectionActionsSheet = ({ board, libraryId, open, onClose, onChanged }) => {
  const [mode, setMode] = useState('menu');
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const navigate = useNavigate();
  const { confirm } = useToast();

  // "Add an item" swaps the WHOLE sheet for AddItemSheet rather than reimplementing its
  // Book/Film choice here — the header "+" already owns that chooser and its routes, and this
  // is the one other place that needs it. `open`/`onClose` pass straight through, so the × still
  // closes the flow entirely, exactly as it does from the header — but this swap is otherwise an
  // in-place sub-mode, the same shape as LibraryActionsSheet's `Share`, so it gets the same
  // `onBack` pairing back to this sheet's own menu rather than only a forward exit.
  if (mode === 'add') {
    return (
      <AddItemSheet
        open={open}
        onClose={onClose}
        libraryId={libraryId}
        collection={{ id: board.id, name: board.title }}
        onBack={() => setMode('menu')}
      />
    );
  }

  const remove = async () => {
    setError(null);
    setIsBusy(true);
    try {
      await collectionsApi.remove(libraryId, board.id);
      await onChanged?.();
      confirm(`${board.title} ungrouped — its items are still here`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={board.title}>
      {error && (
        // `bg-paper` is its own ground, distinct from the sheet's `bg-paper-deep`, so it
        // declares its own foreground in the same rule rather than trusting the sheet's.
        <p role="alert" className="mb-4 border-t-2 border-out bg-paper p-4 text-sm text-ink">
          {error}
        </p>
      )}

      {mode === 'menu' && (
        <div className="flex flex-col gap-2">
          {/* First, per the brief: cataloguing into a collection is the action reached most
              often from this sheet. No collection name here — the Sheet's own title above
              already carries it, so this would otherwise say it twice. */}
          <PlateButton variant="secondary" onClick={() => setMode('add')}>
            Add an item
          </PlateButton>
          <PlateButton
            variant="secondary"
            onClick={() =>
              navigate(`/libraries/${libraryId}/collections/${board.id}/edit`)
            }
          >
            Edit
          </PlateButton>
          <PlateButton variant="danger" onClick={() => setMode('delete')}>
            Delete
          </PlateButton>
        </div>
      )}

      {mode === 'delete' && (
        <>
          {/* Say what the backend ACTUALLY does. Deleting a collection ORPHANS its members: the
              items stay in the library and simply stop being grouped. Calling this "delete"
              without saying so would make a reader think they are about to lose the books. */}
          <p className="mb-4 text-sm">
            Delete the collection <strong>{board.title}</strong>? Its {board.itemCount} items stay
            in this library — they just stop being grouped. Only the grouping goes.
          </p>
          <div className="flex gap-2">
            <PlateButton variant="danger" disabled={isBusy} onClick={remove}>
              {isBusy ? 'Removing' : 'Remove the grouping'}
            </PlateButton>
            <PlateButton variant="secondary" onClick={() => setMode('menu')}>
              Keep it
            </PlateButton>
          </div>
        </>
      )}
    </Sheet>
  );
};

export default CollectionActionsSheet;
