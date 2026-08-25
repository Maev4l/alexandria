import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import FlowMarks from '@/components/imprint/FlowMarks.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import VolumeFrame from '@/components/imprint/VolumeFrame.jsx';
import { detectionApi, itemsApi } from '@/api';
import { useCollectionName } from '@/lib/useCollectionName.js';
import { useFilingSession } from '@/state/FilingSessionContext.jsx';
import { useToast } from '@/state/ToastContext.jsx';

// The identifying input lives in the QUERY, never `location.state` (ui-v3.md ruling H): a cold
// load — a reload, a PWA restart, a shared URL — must re-run detection from `?isbn=` and land
// the reader exactly where they were, still filing into the same collection if `?collectionId=`
// is present. Detection is a side-effect-free read, so re-running it here is safe even though
// AddBook already ran it once before navigating; this screen never trusts a value handed to it
// any other way.
const BookDetectionResults = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isbn = params.get('isbn') ?? '';
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

  const load = useCallback((allowFastPath = true) => {
    if (!isbn) {
      // No ISBN in the query at all is not a detection failure — there was never a code to look
      // up (e.g. this URL was typed or edited by hand, or bookmarked mid-flow). `guard()` in
      // routes.jsx checks only that a user is signed in, not that the query it lands on makes
      // sense, so this is a genuinely reachable dead end, not a theoretical one. Redirected back
      // to AddBook with one shared, type-agnostic message (`NO_INPUT_MESSAGE`,
      // `src/lib/addFlowState.js`) rather than shown inline here — the same construction
      // VideoDetectionResults uses for its own identical case, so "this results route has no
      // input to resolve" reads as one meaning across both flows rather than two invented
      // stories. `replace: true` so the dead-end entry does not linger in history.
      const back = new URLSearchParams();
      if (collectionId) back.set('collectionId', collectionId);
      const qs = back.toString();
      navigate(`/libraries/${libraryId}/add/book${qs ? `?${qs}` : ''}`, {
        replace: true,
        state: { noInput: true },
      });
      return;
    }
    // The fast path: AddBook already ran this exact lookup and handed its own candidates over
    // via `state`. Used ONLY when `forIsbn` matches the ISBN this render is showing — an
    // unmatched or absent tag falls through to a real fetch, so a stale entry can never answer
    // the wrong code. Identical in shape and reasoning to VideoDetectionResults' own fast path;
    // this screen simply never had one, and paid for a second full resolver fan-out on every
    // single scan because of it.
    // `allowFastPath` is turned off by `Try again`, so a retry is always a real fetch — see
    // VideoDetectionResults, where a retry re-serving tagged candidates as fresh was a shipped
    // defect. This screen cannot reach that state today (state only ever arrives after a
    // SUCCESSFUL detection, so the tag never matches while `status` is 'error'), but a safety that
    // holds only because of the current call order is one refactor from not holding.
    if (allowFastPath && location.state?.forIsbn === isbn) {
      setCandidates(location.state.candidates ?? []);
      setErrorMessage(null);
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setErrorMessage(null);
    detectionApi
      .book(isbn)
      .then((response) => {
        setCandidates(response?.detectedBooks ?? []);
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
  }, [isbn, libraryId, collectionId, navigate, location.state]);

  useEffect(() => {
    load();
  }, [load]);

  // Finding 1/2 (ui-v3.md ruling A): a real miss is a NON-EMPTY array whose every entry carries
  // `error` (Google always emits one on zero results), never `detectedBooks.length === 0` — the
  // schema permits a genuinely empty array too, but that models every resolver being
  // UNREACHABLE, not "no book matches this ISBN", and both must offer the same way forward.
  const usable = candidates.filter((candidate) => !candidate.error);
  // Grouped and rendered separately from `usable` (fix round 2 finding 1): a failed candidate
  // is shown as a failure note, never as a row wearing a book's clothes.
  const failed = candidates.filter((candidate) => candidate.error);
  const offerManualEntry = status === 'ready' && usable.length === 0;

  const manualEntryPath = () => {
    const p = new URLSearchParams({ isbn });
    if (collectionId) p.set('collectionId', collectionId);
    return `/libraries/${libraryId}/items/new/book?${p}`;
  };

  const onConfirm = async (candidate, key) => {
    setSaveError(null);
    setSavingKey(key);
    try {
      await itemsApi.createBook(libraryId, {
        title: candidate.title,
        summary: candidate.summary,
        authors: candidate.authors ?? [],
        isbn: candidate.isbn || isbn,
        // Truthiness, never presence (ui-v3.md ruling B): Google's own no-cover candidate is a
        // PRESENT empty string, not an absent key, and `''` must degrade the same way an absent
        // `pictureUrl` does rather than being sent to the API as a real address.
        pictureUrl: candidate.pictureUrl || null,
        collectionId: collectionId ?? null,
        order: null,
      });
      // Cataloguing is a batch activity (PRODUCT.md): loop back to AddBook for the next scan,
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
      navigate(`/libraries/${libraryId}/add/book${p}`, { replace: true });
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="min-h-dvh bg-paper">
      {/* A relative step, not an explicit destination: reached only from AddBook, whether that
          screen was pushed fresh from the library or is itself the loop's replaced entry (see
          onConfirm's own comment) — both cases leave AddBook directly behind this screen in
          history, so `-1` is correct for every in-app path here. (A cold, deep-linked load has
          no predecessor at all rather than a variable one; that is a separate, pre-existing
          property of `navigate(-1)` shared by most of this app's back buttons, not something this
          fix's post-save loop introduced or is scoped to touch.) */}
      <AppHeader title="Book results" onBack={() => navigate(-1)} search={false} />
      <main className="p-4">
        <h1 className="sr-only">Book results</h1>

        {/* Shared with AddBook, AddVideo and VideoDetectionResults — see FilingInto.jsx for why
            this is a component now rather than a fourth copy of the same markup. */}
        <FlowMarks collectionName={collectionName} filedCount={filedCount} />

        {status === 'error' && (
          <div role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-ink">
            <p className="text-sm">{errorMessage}</p>
            {/* `() => load(false)`, never a bare `onClick={load}`: the click event would arrive
                as `allowFastPath` and read truthy. */}
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

        {/* Task 18, fix round 2 finding 2: the scanned code is one fact about the WHOLE lookup,
            not a fact repeated on every candidate — all three rows below are resolutions of
            this one input, so printing it three times differentiated nothing and cost every row
            a line. It lives here once, in the mono (§3 reserves the mono face for numerals;
            `data-mark` is check:browser's hook for the resolved font-family, same convention as
            "filing-into-name" above). */}
        {status !== 'loading' && isbn && (
          <p data-mark="lookup-code" className="num mb-4 text-[13px] text-ink-soft">
            {isbn}
          </p>
        )}

        {status === 'ready' && usable.length > 0 && (
          <ul className="flex flex-col gap-4">
            {usable.map((candidate, index) => {
              const key = candidate.id || `${candidate.source}-${index}`;
              return (
                <li key={key} className="flex gap-4 border-b-2 border-ink pb-4">
                  {/* Reused as-is, not rebuilt: the standard 2:3 Volume Frame, ruled and empty
                      whenever a resolver supplies no artwork. `|| null` collapses BOTH the
                      absent case (Goodreads/TMDB) and the present-but-empty-string case
                      (Google, ruling B) to the same falsy input `pictureSrc()` already treats
                      as "no picture" — never an empty image source, which resolves against the
                      page URL and produces the broken-image glyph DESIGN.md section 6 forbids. */}
                  <VolumeFrame item={{ picture: candidate.pictureUrl || null }} size="candidate" />
                  <div className="min-w-0 flex-1">
                    {/* No `|| 'Untitled'` fallback (fix round 2 finding 1): a candidate reaching
                        this branch already has no `error`, so its title is real. Fabricating
                        one for the branch that DOES fail is a different bug this round removes
                        entirely — see the failure register below, which never reaches this row
                        at all. */}
                    <p className="text-[17px] font-semibold leading-tight text-ink">
                      {candidate.title}
                    </p>
                    {candidate.authors?.length > 0 && (
                      <p className="truncate text-sm text-ink-soft">{candidate.authors.join(', ')}</p>
                    )}
                    <p className="caps mt-1 text-[11px] text-ink-soft">{candidate.source}</p>
                    {/* Nothing is written before this: no candidate reaches itemsApi until
                        the reader presses this button themselves. */}
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

        {/* Fix round 2 finding 1: a failed resolver used to render as a FULL candidate — a
            ruled frame, an invented `Untitled` title in the loudest role on the row, an ISBN
            that was only ever the reader's own code echoed back. That was three faults at once:
            fabricated content in the slot a reader scans first (DESIGN.md §9), a screen that
            could show `Untitled` directly above `NO MATCH FOUND` on a true miss (one candidate,
            two opposite claims), and a hierarchy that buried the one fact that matters — this
            source did not answer — last, in the quiet tone, under the invented one in ink.
            A failure is a ruled NOTE now, not a candidate: no frame, no title role, no action,
            grouped strictly after the real candidates so preview-before-commit still shows it
            without dressing it as a volume. */}
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

export default BookDetectionResults;
