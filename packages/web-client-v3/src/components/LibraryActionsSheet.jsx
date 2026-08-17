import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sheet from '@/components/imprint/Sheet.jsx';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { librariesApi } from '@/api';

const LibraryActionsSheet = ({ library, open, onClose, onChanged, onDeleted }) => {
  const [mode, setMode] = useState('menu');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const navigate = useNavigate();

  const run = async (action, after) => {
    setError(null);
    setIsBusy(true);
    try {
      await action();
      // Writes return an empty body, so the caller re-reads rather than assuming.
      await after?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={library.name}>
      {error && (
        // `bg-paper` is its own ground, distinct from the sheet's `bg-paper-deep`, so it
        // declares its own foreground in the same rule rather than trusting the sheet's.
        <p role="alert" className="mb-4 border-t-2 border-out bg-paper p-4 text-sm text-ink">
          {error}
        </p>
      )}

      {mode === 'menu' && (
        <div className="flex flex-col gap-2">
          <PlateButton variant="secondary" onClick={() => navigate(`/libraries/${library.id}/edit`)}>
            Edit
          </PlateButton>
          <PlateButton variant="secondary" onClick={() => setMode('share')}>
            Share
          </PlateButton>
          {library.sharedTo?.length > 0 && (
            <PlateButton
              variant="secondary"
              onClick={() => navigate(`/libraries/${library.id}/unshare`)}
            >
              Unshare
            </PlateButton>
          )}
          <PlateButton variant="danger" onClick={() => setMode('delete')}>
            Delete
          </PlateButton>
        </div>
      )}

      {mode === 'share' && (
        <>
          <Field
            label="Email"
            type="email"
            value={email}
            // The index updates asynchronously, so a just-shared library can take a moment
            // to appear in the recipient's search. Say so rather than let it look broken.
            hint="They get read-only access. Search may take a moment to catch up."
            onChange={(event) => setEmail(event.target.value)}
          />
          {/* Paired, for the same reason lend is. Share was the identical one-way door: only a
              field and a primary, so a mistaken tap could be escaped only by a key a phone does
              not have or a scrim aria-modal hides. Found while fixing lend — the pattern was
              wrong in two places, not one.
              THAT FIX WAS ONLY HALF DONE. Pairing Share with a "Back" secondary solved the
              one-way door, but a disabled primary still renders as a ruled ink outline (§5),
              and an outline next to an outline of the same colour is not a distinguishable pair
              at rest — the exact shape collision LendSheet had. It was seen at the time (the
              comment above says so) and not fixed then; it is fixed now, with the same §6
              second-form treatment as LendSheet and ItemActionsSheet's lend mode: the empty-
              email slot names the reason instead of showing a disabled twin of Back, and swaps
              to the filled plate once the address is present. "Back" stays "Back" — this
              returns to the sheet's own menu, it does not dismiss the sheet, so it is not
              "Cancel" (that distinction was already correct and is not being flattened here).
              Delete mode below does NOT need this: `danger` renders a red outline, `secondary`
              an ink one, so the two are already distinguishable at rest by colour alone — the
              first form only degrades when the neighbour is the same shape AND the same
              colour, and delete's neighbour is neither. */}
          <div className="flex items-center gap-2">
            {email ? (
              <PlateButton
                disabled={isBusy}
                onClick={() => run(() => librariesApi.share(library.id, email), onChanged)}
              >
                {isBusy ? 'Sharing' : 'Share'}
              </PlateButton>
            ) : (
              <p className="caps flex min-h-12 items-center text-[11px] font-bold text-ink-soft">
                An email address
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
          {/* Say what the action actually does, before it is taken, in the sheet. A toast
              after the fact is not a confirmation. */}
          <p className="mb-4 text-sm">
            Delete <strong>{library.name}</strong> and its {library.totalItems} items? The items go
            with it. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <PlateButton
              variant="danger"
              disabled={isBusy}
              onClick={() => run(() => librariesApi.remove(library.id), onDeleted ?? onChanged)}
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

export default LibraryActionsSheet;
