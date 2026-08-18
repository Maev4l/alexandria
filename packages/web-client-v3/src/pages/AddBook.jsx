import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import BarcodeScanner from '@/components/BarcodeScanner.jsx';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { detectionApi } from '@/api';
import { seedFromAddFlowState } from '@/lib/addFlowState.js';
import { isbnError, normalizeIsbn } from '@/lib/isbn.js';

// Both paths visible at once, never one behind the other (ui-v3.md task 18): the live scanner
// sits above a labelled ISBN field that works whether or not the camera does — a denied
// permission, poor light, or a damaged barcode must never leave a reader with nothing to press.
// A THIRD, separate escape survives from the stub this replaces: "Enter by hand" skips detection
// entirely and goes straight to the full manual form, for the reader who does not want to try a
// lookup at all. Keeping it is the point of Step 5 in the task brief — it is not an add-on to
// this screen, it is the reason `Enter by hand` moved off `AddItemSheet` in the first place
// (see NewBook/NewVideo's own comments and `AddItemSheet.test.jsx`'s reachability suite).
const AddBook = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { collectionId } = seedFromAddFlowState(location.search);
  const manualEntryPath = `/libraries/${libraryId}/items/new/book${
    collectionId ? `?collectionId=${encodeURIComponent(collectionId)}` : ''
  }`;

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(null);
  // A denial is recorded here, on THIS screen, rather than left to BarcodeScanner to explain:
  // that component knows only that the browser refused it, not what a reader should do next.
  // Replacing the whole viewfinder with this message (rather than layering it over a dead
  // camera box) is what "the manual path is always in reach" means in practice — there is
  // nothing left on screen pretending a camera might still arrive.
  const [cameraError, setCameraError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  const resultsPath = (isbn) => {
    const params = new URLSearchParams({ isbn });
    if (collectionId) params.set('collectionId', collectionId);
    return `/libraries/${libraryId}/add/book/results?${params}`;
  };

  // Shared by a successful decode and a manual submit: both end the same way, a navigation to
  // the results screen carrying the code in the QUERY (never `location.state` — ruling H), which
  // is what lets that screen survive a cold load by re-running this exact same read.
  const lookup = async (rawCode) => {
    setLookupError(null);
    setIsBusy(true);
    try {
      await detectionApi.book(rawCode);
      navigate(resultsPath(rawCode));
    } catch (err) {
      // Detection genuinely failing (a network/server error) is the one outcome that must NOT
      // navigate — the reader stays here, on the screen where retrying (or falling back to
      // manual) is still possible, rather than landing on a results screen with nothing to show.
      setLookupError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  // A barcode the camera decoded is already a real, optically-read code — it is not typed input
  // that could carry a typo, so it skips the manual field's own length validation and goes
  // straight to lookup. `isBusy` guards against a second frame decoding the same code again
  // while the first lookup is still in flight.
  const onDecoded = (rawCode) => {
    if (isBusy) return;
    lookup(rawCode);
  };

  const onCodeChange = (event) => {
    const value = event.target.value;
    setCode(value);
    setCodeError(value ? isbnError(value) : null);
  };

  const onManualSubmit = (event) => {
    event.preventDefault();
    const error = isbnError(code);
    setCodeError(error);
    if (error) return;
    lookup(normalizeIsbn(code));
  };

  const canSubmit = !isBusy && !isbnError(code);

  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader title="Add a book" onBack={() => navigate(-1)} search={false} />
      <main className="p-4">
        <h1 className="sr-only">Add a book</h1>

        {cameraError ? (
          <p role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
            Camera access is off for this site. Type the ISBN below instead.
          </p>
        ) : (
          <BarcodeScanner onCode={onDecoded} onError={setCameraError} />
        )}

        <form onSubmit={onManualSubmit} className="mt-6" noValidate>
          <Field
            label="ISBN"
            value={code}
            error={codeError}
            hint={codeError ? undefined : 'Type the 10- or 13-digit ISBN printed on the book.'}
            onChange={onCodeChange}
          />

          {lookupError && (
            <p role="alert" className="mb-6 border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
              {lookupError}
            </p>
          )}

          <PlateButton type="submit" disabled={!canSubmit}>
            {isBusy ? 'Looking it up' : 'Look it up'}
          </PlateButton>
        </form>

        <PlateButton
          variant="secondary"
          className="mt-4"
          onClick={() => navigate(manualEntryPath)}
        >
          Enter by hand
        </PlateButton>
      </main>
    </div>
  );
};

export default AddBook;
