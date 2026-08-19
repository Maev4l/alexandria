import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import BarcodeScanner from '@/components/BarcodeScanner.jsx';
import Field from '@/components/imprint/Field.jsx';
import FlowMarks from '@/components/imprint/FlowMarks.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { detectionApi } from '@/api';
import { NO_INPUT_MESSAGE, seedFromAddFlowState } from '@/lib/addFlowState.js';
import { isbnError, normalizeIsbn } from '@/lib/isbn.js';
import { useCollectionName } from '@/lib/useCollectionName.js';
import { useFilingSession } from '@/state/FilingSessionContext.jsx';

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
  // How many items have gone in since the reader entered this flow. Zero on arrival, so the
  // mark is absent until the first save actually produces something to count.
  const { filedCount } = useFilingSession();

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(null);
  // A denial is recorded here, on THIS screen, rather than left to BarcodeScanner to explain:
  // that component knows only that the browser refused it, not what a reader should do next.
  // Replacing the whole viewfinder with this message (rather than layering it over a dead
  // camera box) is what "the manual path is always in reach" means in practice — there is
  // nothing left on screen pretending a camera might still arrive.
  const [cameraError, setCameraError] = useState(null);
  // Which control started the in-flight lookup, or `null` when none is running — NOT a plain
  // boolean, because `lookup()` below is shared between a decode and a manual submit and only
  // this page knows which one actually fired it. BarcodeScanner's "CODE READ · LOOKING IT UP"
  // narration must appear only for a lookup a code decode started; a bare `isBusy` would also
  // raise it for a manual-field submit, claiming a decode that never happened (viewport-
  // narration task). `isBusy` below is derived from this, so every existing consumer (canSubmit,
  // the submit button's own re-entry guard) is unaffected by the split.
  const [busySource, setBusySource] = useState(null);
  const isBusy = busySource !== null;
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
  // is what lets that screen survive a cold load by re-running this exact same read. `source`
  // ('scan' or 'manual') records only WHO started this particular call, so BarcodeScanner can be
  // told whether to narrate — the request itself is identical either way.
  const lookup = async (rawCode, source) => {
    setLookupError(null);
    setBusySource(source);
    try {
      const response = await detectionApi.book(rawCode);
      // The candidates this call already paid for travel forward as a FAST PATH, exactly as
      // AddVideo's do. Until now this response was thrown away and BookDetectionResults ran the
      // identical `POST /detections` again on mount — two full Google/Babelio/GoodReads fan-outs
      // per scan, on the connection PRODUCT.md describes as poor, in a flow whose whole layout
      // argument (DESIGN.md §4) is that it loops. The film path was fixed for this and its
      // sibling was never checked.
      //
      // Tagged with the ISBN it answers, and trusted on the other side only when the tag
      // matches, so a stale value (browser back/forward, an edited query) falls through to a
      // real fetch instead of answering a different question. The query still carries `?isbn=`
      // unconditionally, so ruling H is untouched: state only ever saves a repeat call, it is
      // never the only way to recover.
      navigate(resultsPath(rawCode), {
        state: { candidates: response?.detectedBooks ?? [], forIsbn: rawCode },
      });
    } catch (err) {
      // Detection genuinely failing (a network/server error) is the one outcome that must NOT
      // navigate — the reader stays here, on the screen where retrying (or falling back to
      // manual) is still possible, rather than landing on a results screen with nothing to show.
      setLookupError(err.message);
    } finally {
      setBusySource(null);
    }
  };

  // A barcode the camera decoded is already a real, optically-read code — it is not typed input
  // that could carry a typo, so it skips the manual field's own length validation and goes
  // straight to lookup. `isBusy` guards against a second frame decoding the same code again
  // while the first lookup is still in flight.
  const onDecoded = (rawCode) => {
    if (isBusy) return;
    lookup(rawCode, 'scan');
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
    lookup(normalizeIsbn(code), 'manual');
  };

  const canSubmit = !isBusy && !isbnError(code);

  return (
    <div className="min-h-dvh bg-paper">
      {/* Explicit destination, not `navigate(-1)`: this screen has two genuinely different
          predecessors — a fresh add from the library (push), and the post-save loop landing
          here after BookDetectionResults REPLACES its own spent results entry (see that
          screen's onConfirm). A relative step is correct for the first and wrong for the
          second — after a replace, `-1` still walks past this screen's own earlier self to
          whatever came before it, never to the library in one step. `ui-v3.md`'s own flow spec
          ("Cancel at any point returns to the library") already named this destination; the
          collection is deliberately NOT carried into it — going back to the library is going
          back to the library, and the board that was being filed is visible there already. */}
      <AppHeader
        title="Add a book"
        onBack={() => navigate(`/libraries/${libraryId}`)}
        search={false}
      />
      <main className="p-4">
        <h1 className="sr-only">Add a book</h1>

        <FlowMarks collectionName={collectionName} filedCount={filedCount} />

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
          <BarcodeScanner
            onCode={onDecoded}
            onError={setCameraError}
            busy={busySource === 'scan'}
          />
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
            onChange={onCodeChange}
          />

          {lookupError && (
            <p role="alert" className="mb-6 border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
              {lookupError}
            </p>
          )}

          {/* Always the same control — a ruled outline that fills to a plate the moment the
              field is valid (DESIGN.md §6's FIRST form). That form holds here only because
              "Enter by hand" below is no longer a second ruled outline in this row: a caps
              reason used to stand in for this button while disabled, but the actual collision
              was two identical outlines side by side, not a missing explanation, so moving the
              manual escape off the outline treatment (see below) is what lets the plain disabled
              button work correctly on its own. */}
          <PlateButton type="submit" disabled={!canSubmit}>
            {isBusy ? 'Looking it up' : 'Look it up'}
          </PlateButton>
        </form>

        {/* Navigation to another route, not an action performed on this screen — so it takes the
            underlined-link treatment DetailMarks already uses for "IN <library>"
            (DESIGN.md §5), not a PlateButton. As a PlateButton it was a second ruled outline
            sitting beside the disabled "Look it up" button, indistinguishable from it at rest;
            as a link it carries no border or fill at all, so there is nothing left to collide
            with. `inline-flex min-h-12 items-center` reserves the same 48px hit target a
            PlateButton claims (DESIGN.md §4) without drawing a second box — the text itself is
            long enough that width is never the constraint the way it is for a short library name
            embedded mid-sentence in DetailMarks. */}
        <Link
          to={manualEntryPath}
          className="mt-4 inline-flex min-h-12 items-center text-sm text-ink underline underline-offset-[3px]"
        >
          Enter by hand
        </Link>
      </main>
    </div>
  );
};

export default AddBook;
