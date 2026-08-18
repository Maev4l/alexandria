import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import CoverCapture from '@/components/CoverCapture.jsx';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { detectionApi } from '@/api';
import { NO_INPUT_MESSAGE, seedFromAddFlowState } from '@/lib/addFlowState.js';

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

  const [title, setTitle] = useState('');
  // Recorded here, on THIS screen, for the identical reason AddBook keeps its own cameraError:
  // CoverCapture knows only that the browser refused it, not what a reader should do next.
  const [cameraError, setCameraError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
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

  // A capture returns an extracted title, which goes into the field for the reader to correct —
  // OCR is fallible, and the fixture this screen is built against deliberately serves a
  // plausibly-wrong title for exactly this reason — rather than treating it as already confirmed.
  //
  // The response's `detectedVideos` are deliberately NOT kept. A round of review traced
  // `handlers/detection.go`'s `handleVideoDetection` end to end: a typed title and an
  // OCR-extracted title both feed the identical `h.s.ResolveVideo(searchTitle)` call
  // (`services/lookup_video.go` → `tmdb.go`'s `ResolveByTitle`, a pure function of the title
  // string). Same title in, same candidates out — there is no such thing as "the OCR call's
  // answer" as distinct from "the query's answer" once a title exists, so caching the former to
  // skip a second network round trip bought nothing and cost the query-based recovery every
  // other detection screen relies on. See `onSubmit` below.
  const onCaptured = async (image) => {
    if (isBusy) return;
    setLookupError(null);
    setIsBusy(true);
    try {
      const response = await detectionApi.video({ image });
      const extracted = response?.extractedTitle ?? '';
      setTitle(extracted);
      if (!extracted) {
        // The real backend never sets `extractedTitle` on an illegible cover (it returns before
        // assigning it) — a genuinely different outcome from a network failure, so it gets its
        // own message rather than falling into the generic error branch below.
        setLookupError('No title could be read from the cover. Type it below instead.');
      }
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const onTitleChange = (event) => {
    setTitle(event.target.value);
  };

  // One path for every title, whichever way it arrived — hand-typed, or OCR-extracted and left
  // untouched, or OCR-extracted and corrected. `detectionApi.video({ title })` runs here first
  // (to catch a network failure before ever navigating, exactly as AddBook's `lookup` does for
  // ISBN), then `?title=` carries the same string in the query so VideoDetectionResults can
  // re-run the identical search itself on a fresh load. There used to be a second branch here
  // that skipped this call for an unedited OCR title and forwarded candidates via
  // `location.state` instead — removed once the backend trace above showed it saved one network
  // round trip and cost recoverability for nothing: a reload or PWA restart on the results route
  // could not reconstruct state that was never in the URL.
  const onSubmit = async (event) => {
    event.preventDefault();
    const trimmed = title.trim();
    // `canSubmit` already keeps the button disabled while this is empty, and (unlike AddBook's
    // ISBN field, whose Enter-key path re-validates against a real format) an empty string has
    // no format to fail — a disabled submit button suppresses the browser's own implicit
    // submission on Enter too, so there is no separate path left for this to guard.
    if (!trimmed) return;
    setLookupError(null);
    setIsBusy(true);
    try {
      await detectionApi.video({ title: trimmed });
      navigate(buildResultsPath(trimmed));
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const canSubmit = !isBusy && title.trim().length > 0;
  // DESIGN.md §6's second form for an inert action slot: a disabled primary reads as a plain
  // ruled outline, indistinguishable at rest from the "Enter by hand" secondary beside it — same
  // 2px ink outline, same transparent ground, no fill on either. The FIRST form (bare disabled
  // outline, no words) holds only while that outline is the only one in its row; a same-colour
  // ruled neighbour is permanently present here, so the first form never actually applies on this
  // screen. While there is nothing valid to submit (and no request already in flight — a busy
  // "Looking it up" is a real action underway, not an inert control), the slot carries the reason
  // in caps instead of the button.
  const hasReason = !isBusy && !canSubmit;
  const titleReasonId = 'add-video-title-reason';

  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader title="Add a film" onBack={() => navigate(-1)} search={false} />
      <main className="p-4">
        <h1 className="sr-only">Add a film</h1>

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
            Camera access is off for this site. Type the title below instead.
          </p>
        ) : (
          <CoverCapture onCapture={onCaptured} onError={setCameraError} />
        )}

        <form onSubmit={onSubmit} className="mt-6" noValidate>
          <Field
            label="Title"
            value={title}
            hint="Type or correct the film’s title."
            describedBy={hasReason ? titleReasonId : undefined}
            onChange={onTitleChange}
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
            // with the actual control (the title field) rather than a button that isn't there.
            <p
              id={titleReasonId}
              className="caps flex min-h-12 items-center text-xs font-extrabold tracking-[0.12em] text-ink-soft"
            >
              A film's title
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

export default AddVideo;
