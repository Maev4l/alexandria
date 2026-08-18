import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import FilingInto from '@/components/imprint/FilingInto.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import PlateLine from '@/components/imprint/PlateLine.jsx';
import VolumeFrame from '@/components/imprint/VolumeFrame.jsx';
import { detectionApi, itemsApi } from '@/api';
import { useCollectionName } from '@/lib/useCollectionName.js';

const FILM = 1;

// Reached one way, exactly like BookDetectionResults: a title — hand-typed, or OCR-extracted and
// left untouched, or OCR-extracted and corrected — travels in the query as `?title=`. A cold load
// (a reload, a PWA restart, a shared link) re-runs `detectionApi.video({ title })` and lands the
// reader back where they were.
//
// This screen used to also accept an OCR result via `location.state`, on the theory that the
// exact search behind an unedited capture could not be reproduced from a URL because the photo
// that produced it was gone. Fix round 1 traced the backend end to end (`handlers/detection.go`'s
// `handleVideoDetection` → `services/lookup_video.go` → `tmdb.go`'s `ResolveByTitle`) and found a
// typed title and an OCR-extracted title feed the IDENTICAL call: same title in, same candidates
// out. The photo was never the reproducible asset — the title always was, and it is exactly as
// URL-shaped regardless of where it came from. `location.state` bought one saved network call and
// cost every reload/PWA-restart on this route the ability to recover at all. Removed; see
// AddVideo's own `onSubmit` for the corresponding half.
//
// With that removed, `?title=` absent is the ONLY way to reach this screen with nothing to
// resolve — no photo, no lost capture, just a typed/edited/bookmarked URL with no input at all
// (`routes.jsx`'s `guard()` checks only that a user is signed in). Handled by redirecting to
// AddVideo with one shared, type-agnostic message — see `load()` below and
// `src/lib/addFlowState.js`'s `NO_INPUT_MESSAGE`, the same construction BookDetectionResults uses.
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
  const [saveError, setSaveError] = useState(null);

  const load = useCallback(() => {
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
  }, [titleParam, libraryId, collectionId, navigate]);

  useEffect(() => {
    load();
  }, [load]);

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
      const p = collectionId ? `?collectionId=${encodeURIComponent(collectionId)}` : '';
      navigate(`/libraries/${libraryId}/add/video${p}`);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader title="Film results" onBack={() => navigate(-1)} search={false} />
      <main className="p-4">
        <h1 className="sr-only">Film results</h1>

        {/* Shared with AddBook, AddVideo and BookDetectionResults — see FilingInto.jsx for why
            this is a component now rather than a fourth copy of the same markup. */}
        <FilingInto name={collectionName} />

        {status === 'error' && (
          <div role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-ink">
            <p className="text-sm">{errorMessage}</p>
            <PlateButton variant="secondary" className="mt-4" onClick={load}>
              Try again
            </PlateButton>
          </div>
        )}

        {status === 'loading' && (
          <p className="caps text-xs font-bold text-ink-soft" aria-busy="true">
            Looking it up
          </p>
        )}

        {/* The searched title, once, at the head — never repeated per row (ruling 4). Content the
            reader typed or corrected, so it takes the SANS, not the mono: §3 reserves Chivo Mono
            for numerals, and a film title is not one — unlike BookDetectionResults' scanned ISBN,
            which this pattern otherwise mirrors exactly. */}
        {status !== 'loading' && titleParam && (
          <p className="caps mb-4 text-[11px] font-bold tracking-[0.16em] text-ink-soft">
            Searched{' '}
            <span data-mark="searched-title" className="normal-case text-[13px] font-normal tracking-normal">
              {titleParam}
            </span>
          </p>
        )}

        {status === 'ready' && usable.length > 0 && (
          <ul className="flex flex-col gap-4">
            {usable.map((candidate, index) => {
              const key = candidate.id || `${candidate.source}-${index}`;
              return (
                <li key={key} className="flex gap-4 border-b-2 border-ink pb-4">
                  <VolumeFrame item={{ picture: candidate.pictureUrl || null }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] font-semibold leading-tight text-ink">
                      {candidate.title}
                    </p>
                    <PlateLine
                      item={{ type: FILM, directors: candidate.directors, releaseYear: candidate.releaseYear }}
                    />
                    {candidate.duration != null && (
                      <p className="num mt-1 text-[12px] text-ink-soft">{candidate.duration}′</p>
                    )}
                    {candidate.cast?.length > 0 && (
                      <p className="truncate text-sm text-ink-soft">{candidate.cast.join(', ')}</p>
                    )}
                    <p className="caps mt-1 text-[11px] text-ink-soft">{candidate.source}</p>
                    {/* Nothing is written before this: no candidate reaches itemsApi until the
                        reader confirms it themselves. */}
                    <PlateButton
                      variant="secondary"
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
