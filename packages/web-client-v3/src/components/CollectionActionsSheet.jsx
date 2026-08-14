import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sheet from '@/components/imprint/Sheet.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { collectionsApi } from '@/api';
import { useToast } from '@/state/ToastContext.jsx';

const CollectionActionsSheet = ({ board, libraryId, open, onClose, onChanged }) => {
  const [mode, setMode] = useState('menu');
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const navigate = useNavigate();
  const { confirm } = useToast();

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
        <p role="alert" className="mb-4 border-t-2 border-out bg-paper p-4 text-sm">
          {error}
        </p>
      )}

      {mode === 'menu' && (
        <div className="flex flex-col gap-2">
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
