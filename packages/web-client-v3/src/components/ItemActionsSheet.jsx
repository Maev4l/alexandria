import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sheet from '@/components/imprint/Sheet.jsx';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { eventsApi, itemsApi } from '@/api';
import { useToast } from '@/state/ToastContext.jsx';

const NAME_MAX = 50;

const ItemActionsSheet = ({ item, libraryId, open, onClose, onChanged }) => {
  const [mode, setMode] = useState('menu');
  const [borrower, setBorrower] = useState('');
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const navigate = useNavigate();
  const { confirm } = useToast();

  const run = async (action, confirmation) => {
    setError(null);
    setIsBusy(true);
    try {
      await action();
      // Every mutation here returns an empty body, so the item is re-read rather than assumed.
      await onChanged?.();
      // The toast confirms only; the failure path below never reaches it.
      confirm(confirmation);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={item.title}>
      {error && (
        <p role="alert" className="mb-4 border-t-2 border-out bg-paper p-4 text-sm">
          {error}
        </p>
      )}

      {mode === 'menu' && (
        <div className="flex flex-col gap-2">
          {item.lentTo && (
            <p className="mb-2 text-sm">
              Out with <strong>{item.lentTo}</strong>.
            </p>
          )}
          <PlateButton
            variant="secondary"
            onClick={() => navigate(`/libraries/${libraryId}/items/${item.id}/edit`)}
          >
            Edit
          </PlateButton>
          {item.lentTo ? (
            <PlateButton
              variant="secondary"
              disabled={isBusy}
              onClick={() =>
                run(
                  () =>
                    eventsApi.create(libraryId, item.id, {
                      type: 'RETURNED',
                      event: item.lentTo,
                    }),
                  `${item.title} is back`,
                )
              }
            >
              {isBusy ? 'Recording' : 'Mark returned'}
            </PlateButton>
          ) : (
            <PlateButton variant="secondary" onClick={() => setMode('lend')}>
              Lend
            </PlateButton>
          )}
          <PlateButton variant="danger" onClick={() => setMode('delete')}>
            Delete
          </PlateButton>
        </div>
      )}

      {mode === 'lend' && (
        <>
          <Field
            label="Who has it"
            maxLength={NAME_MAX}
            counter={NAME_MAX - borrower.length}
            value={borrower}
            onChange={(event) => setBorrower(event.target.value)}
          />
          <PlateButton
            disabled={isBusy || !borrower.trim()}
            onClick={() =>
              run(
                () =>
                  eventsApi.create(libraryId, item.id, {
                    type: 'LENT',
                    event: borrower.trim(),
                  }),
                `${item.title} is out with ${borrower.trim()}`,
              )
            }
          >
            {isBusy ? 'Recording' : 'Record the loan'}
          </PlateButton>
        </>
      )}

      {mode === 'delete' && (
        <>
          {/* Say what the action does, before it is taken, in the sheet. */}
          <p className="mb-4 text-sm">
            Delete <strong>{item.title}</strong> from this library? Its lending history goes with
            it. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <PlateButton
              variant="danger"
              disabled={isBusy}
              onClick={() =>
                run(() => itemsApi.remove(libraryId, item.id), `${item.title} deleted`)
              }
            >
              {isBusy ? 'Deleting' : 'Delete for good'}
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

export default ItemActionsSheet;
