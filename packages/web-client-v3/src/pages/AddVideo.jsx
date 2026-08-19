import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import CoverCapture from '@/components/CoverCapture.jsx';
import Field from '@/components/imprint/Field.jsx';
import FlowMarks from '@/components/imprint/FlowMarks.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { detectionApi } from '@/api';
import { NO_INPUT_MESSAGE, seedFromAddFlowState } from '@/lib/addFlowState.js';
import { useCollectionName } from '@/lib/useCollectionName.js';
import { useFilingSession } from '@/state/FilingSessionContext.jsx';

// Both paths visible at once, the same discipline AddBook uses for ISBN scan vs. manual entry
// (ui-v3.md task 18): a live cover capture sits above a labelled, always-editable title field —
// a denied permission, poor light, or a cover the camera cannot read must never leave a reader
// with nothing to press. The THIRD, separate escape survives unchanged from the stub this
// replaces: "Enter by hand" skips detection entirely and goes to the full manual form. It is not
// this screen's decoration — it is the fix for the live bug where a film could not be entered by
// hand at all (a08e882), so it stays exactly where the stub already put it.
const AddVideo = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { collectionId } = seedFromAddFlowState(location.search);
  const manualEntryPath = `/libraries/${libraryId}/items/new/video${
    collectionId ? `?collectionId=${encodeURIComponent(collectionId)}` : ''
  }`;
  // The design session's own finding: a cataloguing session SITS on this screen and only passes
  // THROUGH the candidate list, briefly, once per capture — so the FILING INTO mark belongs here
  // at least as much as there (ui-v3.md ruling E). Missing from this screen, it was missing from
  // the one place a whole session of back-to-back captures could actually see it.
  const collectionName = useCollectionName(libraryId, collectionId);
  // How many items have gone in since the reader entered this flow. Zero on arrival, so the
  // mark is absent until the first save actually produces something to count.
  const { filedCount } = useFilingSession();

  // Manual title search only — no longer dual-purpose as the OCR-extracted title's holding pen.
  // A capture used to write into this same field and need a SECOND press ("Look it up") to do
  // anything with it, which was the actual defect: pressing the shutter completed nothing by
  // itself. It now runs its own lookup and navigates directly (`onCaptured` below); reviewing and
  // correcting a misread OCR title is VideoDetectionResults' job, on the results screen it
  // already produced, not a step repeated here first.
  const [title, setTitle] = useState('');
  // Recorded here, on THIS screen, for the identical reason AddBook keeps its own cameraError:
  // CoverCapture knows only that the browser refused it, not what a reader should do next.
  const [cameraError, setCameraError] = useState(null);
  // Which control started the in-flight lookup, or `null` when none is running — NOT a plain
  // boolean, because both `onCaptured` and `onSubmit` below call the same `detectionApi.video`
  // and only this page knows which one actually fired it. CoverCapture's "Looking up this cover"
  // narration must appear only for a lookup the shutter started; a bare `isBusy` would also
  // raise it for a typed-title submit, claiming a capture that never happened (viewport-
  // narration task). `isBusy` below is derived from this, so every existing consumer (canSubmit,
  // the re-entry guard) is unaffected by the split.
  const [busySource, setBusySource] = useState(null);
  const isBusy = busySource !== null;
  const [lookupError, setLookupError] = useState(null);
  // Set only by VideoDetectionResults' own redirect: a reader landed back here because the
  // results route had no `?title=` at all — a typed, edited, or bookmarked-mid-flow URL, never a
  // lost capture. Shared text and shape with AddBook's identical case
  // (`src/lib/addFlowState.js`'s `NO_INPUT_MESSAGE`).
  const noInput = Boolean(location.state?.noInput);

  const buildResultsPath = (titleQuery) => {
    const params = new URLSearchParams();
    if (titleQuery) params.set('title', titleQuery);
    if (collectionId) params.set('collectionId', collectionId);
    const qs = params.toString();
    return `/libraries/${libraryId}/add/video/results${qs ? `?${qs}` : ''}`;
  };

  // One-call-capture fix (round 2). Fix round 1 traced `handlers/detection.go`'s
  // `handleVideoDetection` end to end and correctly found a typed title and an OCR-extracted
  // title feed the identical `ResolveVideo` call — so the TWO calls it then shipped (this image
  // call, plus a second title call from a "Look it up" press on the unedited result) were
  // spending network and Bedrock OCR cost on a call whose own candidates it discarded, then
  // re-deriving the identical answer from the title a moment later. The structural fault wasn't
  // the extra call so much as its cause: capturing filled a field owned by a DIFFERENT button,
  // so pressing the shutter completed nothing on its own.
  //
  // Fixed here by keeping what this call already returns. `response.detectedVideos` — the TMDB
  // candidates this exact image call already paid for — travels straight to the results screen
  // as a fast-path `state`, tagged with the title it answers (`forTitle`) so a stale or
  // mismatched value is never trusted (see VideoDetectionResults' own `load()`). The query still
  // carries `?title=` on its own, unconditionally, so a reload or PWA restart recovers exactly as
  // before — state only ever saves a repeat call, it is never the only way to recover.
  const onCaptured = async (image) => {
    if (isBusy) return;
    setLookupError(null);
    setBusySource('capture');
    try {
      const response = await detectionApi.video({ image });
      const extracted = response?.extractedTitle ?? '';
      if (!extracted) {
        // The real backend never sets `extractedTitle` on an illegible cover (it returns before
        // assigning it) — a genuinely different outcome from a network failure, so it gets its
        // own message rather than falling into the generic error branch below. There is nothing
        // to navigate to without a title, so this stays on the capture screen.
        setLookupError('No title could be read from the cover. Type it below instead.');
        return;
      }
      navigate(buildResultsPath(extracted), {
        state: { candidates: response?.detectedVideos ?? [], forTitle: extracted },
      });
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setBusySource(null);
    }
  };

  const onTitleChange = (event) => {
    setTitle(event.target.value);
  };

  // The manual-search half of the same one-call discipline: a hand-typed title is looked up ONCE
  // here (to catch a network failure before ever navigating, exactly as AddBook's `lookup` does
  // for ISBN), and the candidates that call already returned travel forward the same way a
  // capture's do — as a `state` fast path tagged with the title, alongside the `?title=` query
  // every reload recovers from regardless.
  const onSubmit = async (event) => {
    event.preventDefault();
    const trimmed = title.trim();
    // `canSubmit` already keeps the button disabled while this is empty, and (unlike AddBook's
    // ISBN field, whose Enter-key path re-validates against a real format) an empty string has
    // no format to fail — a disabled submit button suppresses the browser's own implicit
    // submission on Enter too, so there is no separate path left for this to guard.
    if (!trimmed) return;
    setLookupError(null);
    setBusySource('title');
    try {
      const response = await detectionApi.video({ title: trimmed });
      navigate(buildResultsPath(trimmed), {
        state: { candidates: response?.detectedVideos ?? [], forTitle: trimmed },
      });
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setBusySource(null);
    }
  };

  const canSubmit = !isBusy && title.trim().length > 0;

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      {/* Explicit destination, not `navigate(-1)`: this screen has two genuinely different
          predecessors — a fresh add from the library (push), and the post-save loop landing
          here after VideoDetectionResults REPLACES its own spent results entry (see that
          screen's onConfirm). A relative step is correct for the first and wrong for the
          second — after a replace, `-1` still walks past this screen's own earlier self to
          whatever came before it, never to the library in one step. `ui-v3.md`'s own flow spec
          ("Cancel at any point returns to the library") already named this destination; the
          collection is deliberately NOT carried into it — going back to the library is going
          back to the library, and the board that was being filed is visible there already. */}
      <AppHeader
        title="Add a film"
        onBack={() => navigate(`/libraries/${libraryId}`)}
        search={false}
      />
      {/* Bottom safe-area padding is load-bearing HERE and was not before: with the capture
          surface taking the free space, the form and the manual escape are pushed against the
          viewport's bottom edge rather than following the content. `p-4` alone would leave the
          escape 16px from the edge — under the home indicator on an installed PWA, which is
          exactly the case ui-v3.md §7 names for a bottom-anchored action. */}
      <main className="flex flex-1 flex-col p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <h1 className="sr-only">Add a film</h1>

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

        {/* The capture surface takes the free vertical space and centres in it, rather than
            hugging the header with the page's dead space collecting at the bottom. The form and
            the manual escape keep their natural height below, so nothing is pushed off-screen —
            only the slack moves. Deliberately vertical only: the frame stays flush left, which
            is where the column's own margin puts every other block on this screen. */}
        <div className="flex flex-1 items-center">
          {cameraError ? (
            <p role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
              Camera access is off for this site. Type the title below instead.
            </p>
          ) : (
            <CoverCapture
              onCapture={onCaptured}
              onError={setCameraError}
              busy={busySource === 'capture'}
            />
          )}
        </div>

        <form onSubmit={onSubmit} className="mt-6" noValidate>
          <Field
            label="Title"
            value={title}
            hint="Type the film’s title."
            onChange={onTitleChange}
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
              button work correctly on its own. Labelled "Look up this title" — paired with
              CoverCapture's own "Look up this cover" — so each of the two independent paths to
              the results screen names the outcome it performs, not a step ("Capture"/"Look it
              up") that used to need the OTHER one to finish. */}
          <PlateButton type="submit" disabled={!canSubmit}>
            {isBusy ? 'Looking up this title' : 'Look up this title'}
          </PlateButton>
        </form>

        {/* Navigation to another route, not an action performed on this screen — so it takes the
            underlined-link treatment DetailMarks already uses for "IN <library>"
            (DESIGN.md §5), not a PlateButton. As a PlateButton it was a second ruled outline
            sitting beside the disabled "Look up this title" button, indistinguishable from it at
            rest; as a link it carries no border or fill at all, so there is nothing left to
            collide with. `inline-flex min-h-12 items-center` reserves the same 48px hit target a
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

export default AddVideo;
