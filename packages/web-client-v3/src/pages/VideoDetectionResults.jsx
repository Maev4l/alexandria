import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import Field from '@/components/imprint/Field.jsx';
import FlowMarks from '@/components/imprint/FlowMarks.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import PlateLine from '@/components/imprint/PlateLine.jsx';
import VolumeFrame from '@/components/imprint/VolumeFrame.jsx';
import { detectionApi, itemsApi } from '@/api';
import { useCollectionName } from '@/lib/useCollectionName.js';
import { useFilingSession } from '@/state/FilingSessionContext.jsx';
import { useToast } from '@/state/ToastContext.jsx';

const FILM = 1;

// Reached one way, exactly like BookDetectionResults: a title — hand-typed, or OCR-extracted and
// left untouched, or OCR-extracted and corrected — travels in the query as `?title=`. A cold load
// (a reload, a PWA restart, a shared link) re-runs `detectionApi.video({ title })` and lands the
// reader back where they were.
//
// Fix round 1 traced the backend end to end (`handlers/detection.go`'s `handleVideoDetection` →
// `services/lookup_video.go` → `tmdb.go`'s `ResolveByTitle`) and found a typed title and an
// OCR-extracted title feed the IDENTICAL call: same title in, same candidates out. It used that
// finding to conclude `location.state` should never be read here — which fixed recoverability but
// created a NEW defect (the one-call-capture task): AddVideo's shutter had nowhere to hand the
// candidates its own image call already returned, so it called `{ title }` a second time just to
// get back what `{ image }` had already produced. State is reinstated here, round 2, but strictly
// as a FAST PATH, never as a substitute for the query: it is trusted only when it is tagged
// (`forTitle`) with the exact title this render is showing, so a stale value — browser
// back/forward, or a re-search that changed the query — falls through to a real fetch instead of
// answering the wrong question. `?title=` absent is still the only way this screen has nothing to
// resolve at all; handled the same way as before, by redirecting to AddVideo with the shared
// `NO_INPUT_MESSAGE` (`src/lib/addFlowState.js`).
const VideoDetectionResults = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const titleParam = params.get('title') ?? '';
  const collectionId = params.get('collectionId') ?? undefined;

  const [status, setStatus] = useState('loading');
  const [candidates, setCandidates] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const collectionName = useCollectionName(libraryId, collectionId);
  const [savingKey, setSavingKey] = useState(null);
  // Filing was completely silent before this: the POST succeeded, the app replaced back to the
  // capture screen, and the DOM there was textually identical to a fresh arrival. A reader could
  // not tell "saved, next please" from "something bounced me back" — and would not report it,
  // because there is nothing to point at. Every other mutation in this app already confirms
  // (lend, return, delete, collection delete, clear history); capture was the only one that did
  // not, so this closes an inconsistency with our own convention rather than an outside one.
  const { confirm } = useToast();
  // The toast answers the LAST item and auto-dismisses after four seconds. The tally accumulates
  // and stays, which is what answers "where did I get to?" at item ten.
  const { filedCount, recordFiled } = useFilingSession();
  const [saveError, setSaveError] = useState(null);
  // The review step AddVideo used to run on the capture screen, before the reader ever saw a
  // candidate: OCR is fallible, so the searched title stays correctable here rather than
  // confirmed sight-unseen. Synced from the query on every navigation so a fresh capture or a
  // "Try again" always starts the field from what is actually on screen, not a stale edit left
  // over from a previous search.
  const [editTitle, setEditTitle] = useState(titleParam);
  const [isResearching, setIsResearching] = useState(false);

  useEffect(() => {
    setEditTitle(titleParam);
  }, [titleParam]);

  const load = useCallback((allowFastPath = true) => {
    if (!titleParam) {
      // No title in the query at all: there was never a search to run, so this redirects to
      // AddVideo rather than showing an inline error — the same shared construction
      // BookDetectionResults uses for its own identical `!isbn` case. `replace: true` so the
      // dead-end entry does not linger in history.
      const back = new URLSearchParams();
      if (collectionId) back.set('collectionId', collectionId);
      const qs = back.toString();
      navigate(`/libraries/${libraryId}/add/video${qs ? `?${qs}` : ''}`, {
        replace: true,
        state: { noInput: true },
      });
      return;
    }
    // The fast path: AddVideo already ran this exact search (capture or typed) and handed its
    // own candidates over via `state`. Only used when `forTitle` matches the title this render is
    // showing — see the module comment above for why an unmatched tag must not be trusted.
    // `allowFastPath` is what `Try again` turns off, and this is the defect it fixes: after a
    // failed re-search the URL is unchanged, so the tag still matched and this path re-served the
    // PREVIOUS candidates as `ready` — a control labelled with a specific action presenting stale
    // results as fresh, the rule ui-v3.md §7 records as already learned on item detail and which
    // shipped again four screens later. A retry is a demand for a real fetch.
    //
    // A PARAMETER, not a read of `status`. Deriving it from state would put `status` in this
    // callback's dependencies, and this callback drives a fetch that SETS `status` — an effect
    // that retriggers itself, which is not a subtle risk: it exhausted a mocked response queue and
    // crashed the suite on the first run.
    if (allowFastPath && location.state?.forTitle === titleParam) {
      setCandidates(location.state.candidates ?? []);
      setErrorMessage(null);
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setErrorMessage(null);
    detectionApi
      .video({ title: titleParam })
      .then((response) => {
        setCandidates(response?.detectedVideos ?? []);
        setStatus('ready');
      })
      .catch((err) => {
        setErrorMessage(err.message);
        setStatus('error');
      });
  // `navigate` sits in this dependency chain and the chain drives a FETCH, so this quietly
  // depends on `useNavigate()` returning a stable reference across renders. It does under
  // react-router-dom 7, and this reliance predates the history fix rather than arriving with it —
  // but an upgrade that destabilised it would reintroduce a refetch loop in PRODUCTION, not only
  // in a test, and the symptom (repeated /detections calls) is one a reader would never report as
  // a bug. Written here rather than only in the test that first tripped over it.
  }, [titleParam, libraryId, collectionId, navigate, location.state]);

  useEffect(() => {
    load();
  }, [load]);

  // The reader's own correction of a misread cover, made HERE rather than by walking back to
  // AddVideo (see AddVideo.jsx's own note on why the review step moved). One call for the
  // corrected title, then the URL is updated to match — via `load()`'s own fast path, not a
  // second fetch — so a reload after correcting recovers the CORRECTED search, not the original.
  const onResearch = async (event) => {
    event.preventDefault();
    const trimmed = editTitle.trim();
    if (!trimmed || isResearching) return;
    setIsResearching(true);
    setErrorMessage(null);
    try {
      const response = await detectionApi.video({ title: trimmed });
      const p = new URLSearchParams();
      p.set('title', trimmed);
      if (collectionId) p.set('collectionId', collectionId);
      // `replace: true`: a correction supersedes the search that led here rather than adding a
      // new step to the flow — pressing back from the corrected results should return to
      // AddVideo, not to an earlier, wrong-titled results page.
      navigate(`/libraries/${libraryId}/add/video/results?${p.toString()}`, {
        replace: true,
        state: { candidates: response?.detectedVideos ?? [], forTitle: trimmed },
      });
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    } finally {
      setIsResearching(false);
    }
  };

  // Ruling A (task-19 brief, overriding a plain `length === 0` check): video has exactly one
  // resolver (TMDB), and it emits one candidate carrying `error` on a real miss
  // (services/resolvers/tmdb.go:150-158) — never an empty array. A real miss is therefore a
  // non-empty array whose every entry has `error`, identical in shape to the book side.
  const usable = candidates.filter((candidate) => !candidate.error);
  // Grouped and rendered separately (ruling 1, overriding the brief): a failed resolver is a
  // ruled failure note, never a candidate wearing a title it does not have.
  const failed = candidates.filter((candidate) => candidate.error);
  const offerManualEntry = status === 'ready' && usable.length === 0;

  const manualEntryPath = () => {
    const p = new URLSearchParams();
    if (titleParam) p.set('title', titleParam);
    if (collectionId) p.set('collectionId', collectionId);
    const qs = p.toString();
    return `/libraries/${libraryId}/items/new/video${qs ? `?${qs}` : ''}`;
  };

  const onConfirm = async (candidate, key) => {
    setSaveError(null);
    setSavingKey(key);
    try {
      await itemsApi.createVideo(libraryId, {
        title: candidate.title,
        summary: candidate.summary,
        directors: candidate.directors ?? [],
        cast: candidate.cast ?? [],
        releaseYear: candidate.releaseYear,
        duration: candidate.duration,
        tmdbId: candidate.tmdbId || null,
        // Truthiness, never presence (ruling B): TMDB guards its own poster pointer, but the
        // shared handling must also survive a present empty string the way Google's book
        // candidates can carry one — an empty image source resolves against the page URL and
        // fails, producing the broken-image glyph DESIGN.md section 6 forbids outright.
        pictureUrl: candidate.pictureUrl || null,
        collectionId: collectionId ?? null,
        order: null,
      });
      // Cataloguing is a batch activity (PRODUCT.md): loop back to AddVideo for the next capture,
      // carrying the same collection, rather than exiting the flow after one item.
      //
      // `replace: true` is load-bearing, not cosmetic: this results page is SPENT the instant the
      // candidate above is saved — its candidates answer an item that already exists — so pushing
      // a new history entry on top of it leaves it reachable by pressing back from the capture
      // screen this loop lands on. Ten items in, that is ten back-steps to reach anything real.
      // Replacing it means the capture screen's own explicit "back goes to the library" (below)
      // is the only route away from here, in one step, regardless of how many items the session
      // has already catalogued.
      confirm(`${candidate.title} filed`);
      recordFiled();
      const p = collectionId ? `?collectionId=${encodeURIComponent(collectionId)}` : '';
      navigate(`/libraries/${libraryId}/add/video${p}`, { replace: true });
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="min-h-dvh bg-paper">
      {/* A relative step, not an explicit destination: reached only from AddVideo, whether that
          screen was pushed fresh from the library or is itself the loop's replaced entry (see
          onConfirm's own comment) — both cases leave AddVideo directly behind this screen in
          history, so `-1` is correct for every in-app path here. (A cold, deep-linked load has
          no predecessor at all rather than a variable one; that is a separate, pre-existing
          property of `navigate(-1)` shared by most of this app's back buttons, not something this
          fix's post-save loop introduced or is scoped to touch.) */}
      <AppHeader title="Film results" onBack={() => navigate(-1)} search={false} />
      <main className="p-4">
        <h1 className="sr-only">Film results</h1>

        {/* Shared with AddBook, AddVideo and BookDetectionResults — see FilingInto.jsx for why
            this is a component now rather than a fourth copy of the same markup. */}
        <FlowMarks collectionName={collectionName} filedCount={filedCount} />

        {status === 'error' && (
          <div role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-ink">
            <p className="text-sm">{errorMessage}</p>
            {/* `() => load(false)`, never a bare `onClick={load}`: React hands the click event
                through as the first argument, so passing the function directly would send a
                SyntheticEvent where `allowFastPath` is read — truthy, and the fast path would
                stay on. */}
            <PlateButton variant="secondary" className="mt-4" onClick={() => load(false)}>
              Try again
            </PlateButton>
          </div>
        )}

        {status === 'loading' && (
          <p className="caps text-xs font-bold text-ink-soft" aria-busy="true">
            Looking it up
          </p>
        )}

        {/* The searched title, once, at the head — never repeated per row (ruling 4). Editable
            rather than a static label: this is the review step the capture screen no longer
            performs (one-call-capture task), since OCR is fallible and the reader must be able to
            correct a misread cover without walking back to AddVideo. It takes the SANS, not the
            mono, the same as the read-only version it replaces: §3 reserves Chivo Mono for
            numerals, and a film title is not one — unlike BookDetectionResults' scanned ISBN,
            which this pattern otherwise mirrors exactly.
            THE HINT NO LONGER NAMES OCR. This screen is reached three ways — a captured cover, a
            hand-typed title, and the camera-denied fallback — and the hint read "OCR can misread a
            cover" on all of them, telling a reader who typed the title themselves that a camera
            had misread something. Wording it for what is true on every path costs nothing and
            asserts nothing that did not happen; carrying a `source: 'ocr'` flag to print two
            variants would buy a sentence about a mechanism the reader cannot act on either way.
            COLLAPSED ON A HIT. When candidates are on screen the head is the field alone, no hint:
            the answer is below, and a correction affordance shouting over it inverts the screen.
            On a miss the hint returns, because that is exactly when correcting is the next move. */}
        {status !== 'loading' && (
          <form onSubmit={onResearch} className="mb-2" noValidate>
            <Field
              label="Title"
              value={editTitle}
              hint={usable.length > 0 ? undefined : 'Not the right film? Correct the title and search again.'}
              onChange={(event) => setEditTitle(event.target.value)}
            />
            <PlateButton
              type="submit"
              variant="secondary"
              disabled={isResearching || editTitle.trim().length === 0}
              reason="Type a title to search for first."
            >
              {isResearching ? 'Looking up this title' : 'Look up this title'}
            </PlateButton>
          </form>
        )}

        {status === 'ready' && usable.length > 0 && (
          <ul className="flex flex-col gap-4">
            {usable.map((candidate, index) => {
              const key = candidate.id || `${candidate.source}-${index}`;
              return (
                <li key={key} className="flex gap-4 border-b-2 border-ink pb-4">
                  <VolumeFrame item={{ picture: candidate.pictureUrl || null }} size="candidate" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-semibold leading-tight text-ink">
                      {candidate.title}
                    </p>
                    {/* `DIRECTOR · YEAR · RUNTIME`, one line. The runtime used to keep a line of
                        its own, which spends a whole row-line on a single number — and on a
                        comparison screen every row's height is paid once per candidate, five
                        times at the resolver's maximum. §5 already varies this line by surface
                        (it gains the edition on item detail), so this is a third variant of one
                        rule rather than a new construction. */}
                    <PlateLine
                      surface="candidate"
                      item={{
                        type: FILM,
                        directors: candidate.directors,
                        releaseYear: candidate.releaseYear,
                        duration: candidate.duration,
                      }}
                    />
                    {candidate.cast?.length > 0 && (
                      // THE FIRST TWO NAMES, and nothing is truncated — the field is DEFINED
                      // shorter than the data, which is a different act from clipping a string.
                      // `truncate` cut mid-word (`Nathalie D…`) and letting all five wrap is the
                      // other wrong answer: three lines per row across five rows, on a screen
                      // whose job is comparison. §4 settles it — the row carries recognition,
                      // detail carries identification — and a cast line discriminates through its
                      // LEAD; nobody chooses on the fourth and fifth names. The browse stream
                      // prints no cast at all, so this field exists only for comparison and is
                      // sized for it. Item detail carries the full five.
                      <p className="text-sm text-ink-soft">{candidate.cast.slice(0, 2).join(', ')}</p>
                    )}
                    {/* NO SOURCE BADGE on a successful film candidate. Video has one resolver, so
                        `TMDB` is a constant: five identical labels down a five-row list, five
                        copies of one fact differentiating nothing — "nothing is labelled twice"
                        applied vertically. It is NOT relocated to the head either; a reader does
                        not act on a film's provenance, so stating it once would still be stating
                        something nobody needs.
                        It stays on the BOOK rows, where it genuinely varies (Google / Babelio /
                        Goodreads), and on the failure notes below on both screens, where naming
                        WHICH resolver did not answer is the whole content of the note. Same rule,
                        different data — the same asymmetry that gives the two capture frames
                        different shapes.
                        Nothing is written before this: no candidate reaches itemsApi until the
                        reader confirms it themselves. */}
                    {/* THE PRIMARY PLATE, and the only one in this flow. At rest no chrome
                        yellow existed anywhere in the add path: every `Use this`, both shutters,
                        both manual escapes and the re-search were `secondary`, and the two
                        `primary` submits are disabled at rest and therefore render AS the
                        secondary outline. So the accent marked the fallback route and nothing
                        else, against DESIGN.md §2's law that `--imprint` is the apparatus of
                        acting. Filing a candidate is this flow's only write.
                        Three small plates in a list are not the accent spent decoratively —
                        each is a genuine commit, and three ruled outlines read as three options
                        where nothing acts. It also settles the head collision with no second
                        mechanism: the re-search stays `secondary`, so redo and commit stop
                        looking identical and the wider control is no longer the one that
                        discards the answer. */}
                    <PlateButton
                      className="mt-2"
                      disabled={savingKey != null}
                      onClick={() => onConfirm(candidate, key)}
                    >
                      {savingKey === key ? 'Saving' : 'Use this'}
                    </PlateButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* A failed resolver is a ruled NOTE, never a candidate — no frame, no title role, no
            action (ruling 1, overriding the brief). Grouped strictly after the real candidates. */}
        {status === 'ready' && failed.length > 0 && (
          <ul className="mt-4 flex flex-col">
            {failed.map((candidate, index) => (
              <li
                key={candidate.id || `${candidate.source}-failed-${index}`}
                className="caps border-t border-ink py-2 text-[11px] text-ink-soft"
              >
                {candidate.source} — no answer
              </li>
            ))}
          </ul>
        )}

        {saveError && (
          <p role="alert" className="mt-4 border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
            {saveError}
          </p>
        )}

        {offerManualEntry && (
          <div className="mt-4 border-2 border-ink p-8 text-center">
            <p className="caps text-xs font-bold text-ink-soft">No match found</p>
            <PlateButton
              variant="secondary"
              className="mt-4"
              onClick={() => navigate(manualEntryPath())}
            >
              Enter by hand
            </PlateButton>
          </div>
        )}
      </main>
    </div>
  );
};

export default VideoDetectionResults;
