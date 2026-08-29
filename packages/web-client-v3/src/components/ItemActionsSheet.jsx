import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sheet from '@/components/imprint/Sheet.jsx';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { eventsApi, itemsApi } from '@/api';
import { useToast } from '@/state/ToastContext.jsx';

const NAME_MAX = 50;

const ItemActionsSheet = ({ item, libraryId, open, onClose, onChanged, onDeleted }) => {
  const [mode, setMode] = useState('menu');
  const [borrower, setBorrower] = useState('');
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const navigate = useNavigate();
  const { confirm } = useToast();

  const run = async (action, confirmation, after = onChanged) => {
    setError(null);
    setIsBusy(true);
    try {
      await action();
      // Every mutation here returns an empty body, so the item is re-read rather than assumed —
      // except a delete, where there is nothing left to read.
      await after?.();
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
        // `bg-paper` is its own ground, distinct from the sheet's `bg-paper-deep`, so — per the
        // same rule that fixed Sheet.jsx — it declares its own foreground rather than trusting
        // whatever ink the sheet happens to supply.
        <p role="alert" className="mb-4 border-t-2 border-out bg-paper p-4 text-sm text-ink">
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
            // The type travels with the navigation so the edit screen can print `Edit book` or
            // `Edit film` on its first frame instead of printing `Edit item` and correcting
            // itself once the fetch lands. We are holding the whole record here; not passing it
            // makes that screen re-derive a fact this one already has.
            onClick={() =>
              navigate(`/libraries/${libraryId}/items/${item.id}/edit`, {
                state: { type: item.type },
              })
            }
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
            value={borrower}
            onChange={(event) => setBorrower(event.target.value)}
          />
          {/* Paired with a secondary, exactly as delete is paired with "Keep it" — Lend was a
              one-way door before this pairing existed, and that fix is correct and unrelated
              to the one below. "Back", not "Cancel": this returns to the sheet's own menu
              rather than dismissing the sheet, so it keeps its own label.
              The action slot's second form (LendSheet's identical fix — same defect, second
              place it shipped): a disabled primary renders as a ruled outline, and outline vs
              outline is not a distinguishable pair when both sit on screen at once — "Record
              the loan" and "Back" were the same shape at rest, in the flow PRODUCT.md times in
              seconds. The reason takes the button's own position in `--ink-soft` caps instead
              of a disabled twin of Back; the reason's `min-h-12` matches PlateButton's own so
              the slot's height is reserved and the row does not resize on the swap. Also drops
              the "50 LEFT" counter, a budget nobody at the door is near. */}
          <div className="flex items-center gap-2">
            {borrower.trim() ? (
              <PlateButton
                disabled={isBusy}
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
            ) : (
              <p className="caps flex min-h-12 items-center text-[11px] font-bold text-ink-soft">
                A borrower's name
              </p>
            )}
            <PlateButton variant="secondary" onClick={() => setMode('menu')}>
              Back
            </PlateButton>
          </div>
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
                run(
                  () => itemsApi.remove(libraryId, item.id),
                  `${item.title} deleted`,
                  onDeleted ?? onChanged,
                )
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
