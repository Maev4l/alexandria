import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import BarcodeScanner from '@/components/BarcodeScanner.jsx';
import Field from '@/components/imprint/Field.jsx';
import FilingInto from '@/components/imprint/FilingInto.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { detectionApi } from '@/api';
import { NO_INPUT_MESSAGE, seedFromAddFlowState } from '@/lib/addFlowState.js';
import { isbnError, normalizeIsbn } from '@/lib/isbn.js';
import { useCollectionName } from '@/lib/useCollectionName.js';

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
  // The design session's own finding: a cataloguing session SITS on this screen and only passes
  // THROUGH the candidate list, briefly, once per scan — so the FILING INTO mark belongs here at
  // least as much as there (ui-v3.md ruling E). Missing from this screen, it was missing from the
  // one place a whole session of back-to-back scans could actually see it.
  const collectionName = useCollectionName(libraryId, collectionId);

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
  // Set only by BookDetectionResults' own redirect: a reader landed back here because the
  // results route had no `?isbn=` at all — a typed, edited, or bookmarked-mid-flow URL, never a
  // lost capture (this screen has no camera state of its own to lose). Printed, not a toast,
  // because it explains why the reader is on this screen rather than the results page they may
  // have expected. Shared text and shape with AddVideo's identical case
  // (`src/lib/addFlowState.js`'s `NO_INPUT_MESSAGE`).
  const noInput = Boolean(location.state?.noInput);

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
  // DESIGN.md §6's second form for an inert action slot: a disabled primary reads as a plain
  // ruled outline, indistinguishable at rest from the "Enter by hand" secondary beside it — same
  // 2px ink outline, same transparent ground, no fill on either. The FIRST form (bare disabled
  // outline, no words) holds only while that outline is the only one in its row; a same-colour
  // ruled neighbour is permanently present here, so the first form never actually applies on this
  // screen — whether the field is empty or carries a format error already shown inline. While
  // there is nothing valid to submit (and no request already in flight — a busy "Looking it up"
  // is a real action underway, not an inert control), the slot carries the reason in caps instead
  // of the button.
  const hasReason = !isBusy && !canSubmit;
  const codeReasonId = 'add-book-code-reason';

  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader title="Add a book" onBack={() => navigate(-1)} search={false} />
      <main className="p-4">
        <h1 className="sr-only">Add a book</h1>

        <FilingInto name={collectionName} />

        {/* Nothing failed here — the reader arrived at a route with no input, usually a typed or
            shared bare URL. `--out` means on loan and nothing else (DESIGN.md palette law), and
            §6's Error construction (a 2px OUT rule) tells a reader they did something wrong when
            they did not. Borrowed from `src/pwa/UpdateNotice.jsx`'s own recessed-notice
            construction instead — 3px ink, not 2px out — the shape this app already uses for "a
            fact worth a printed line" that is not a failure. */}
        {noInput && (
          <p className="mb-6 border-t-[3px] border-ink bg-paper-deep p-4 text-sm text-ink">
            {NO_INPUT_MESSAGE}
          </p>
        )}

        {cameraError ? (
          <p role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
            Camera access is off for this site. Type the ISBN below instead.
          </p>
        ) : (
          <BarcodeScanner onCode={onDecoded} onError={setCameraError} />
        )}

        <form onSubmit={onManualSubmit} className="mt-6" noValidate>
          {/* type="text", deliberately, NOT `type="tel"`/`inputMode="numeric"` despite the field
              only ever holding thirteen digits in the common case: `src/lib/isbn.js`'s own
              validator — `/^[0-9]{9}[0-9Xx]$|^[0-9]{13}$/` — accepts a trailing `X` checksum
              character for an ISBN-10 (ISO 2108), a REAL, valid, still-printed value. A numeric
              keypad cannot type `X` at all on iOS or Android, which would make that legitimate
              input untypeable on exactly the one-handed phone this change would otherwise help
              (PRODUCT.md's bookshop scene) — rare, device-only, and unreportable by a reader who
              does not know an ISBN-10 can end in a letter. General rule: never make a valid input
              impossible to enter to save keystrokes on the common case. Revisit only if a keyboard
              mode is found that reliably offers digits AND `X` on both platforms — name the actual
              behaviour, not a spec table, before adopting one. */}
          <Field
            label="ISBN"
            type="text"
            value={code}
            error={codeError}
            hint={codeError ? undefined : 'Type the 10- or 13-digit ISBN printed on the book.'}
            describedBy={hasReason ? codeReasonId : undefined}
            onChange={onCodeChange}
          />

          {lookupError && (
            <p role="alert" className="mb-6 border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
              {lookupError}
            </p>
          )}

          {hasReason ? (
            // "instead of the control", per §6 — no button at all in this state, so there is
            // nothing left to collide with "Enter by hand". `min-h-12` reserves the same height
            // PlateButton itself claims, so nothing jumps when the swap happens either way.
            // `id` is what `Field`'s `describedBy` links to above, for the reader interacting
            // with the actual control (the code field) rather than a button that isn't there.
            <p
              id={codeReasonId}
              className="caps flex min-h-12 items-center text-xs font-extrabold tracking-[0.12em] text-ink-soft"
            >
              An ISBN
            </p>
          ) : (
            <PlateButton type="submit" disabled={isBusy}>
              {isBusy ? 'Looking it up' : 'Look it up'}
            </PlateButton>
          )}
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
