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
        <p role="alert" className="mb-4 border-t-2 border-out bg-paper p-4 text-sm">
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
              wrong in two places, not one. */}
          <div className="flex gap-2">
            <PlateButton
              disabled={isBusy || !email}
              onClick={() => run(() => librariesApi.share(library.id, email), onChanged)}
            >
              {isBusy ? 'Sharing' : 'Share'}
            </PlateButton>
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
