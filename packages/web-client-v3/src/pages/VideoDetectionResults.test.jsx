import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/state/ToastContext.jsx';
import { collectionsApi, detectionApi, itemsApi } from '@/api';

vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    detectionApi: { ...actual.detectionApi, video: vi.fn() },
    itemsApi: { ...actual.itemsApi, createVideo: vi.fn() },
    collectionsApi: { ...actual.collectionsApi, get: vi.fn() },
  };
});

// A `LocationProbe` can see WHERE a navigation landed, but `location` carries no trace of HOW —
// push and replace produce an identical `location` object. Recording the real `navigate` calls
// (still forwarded to the genuine hook, so the app behaves exactly as it does today) is the only
// way to assert `replace: true` rather than merely the destination, which is the whole point of
// the post-save-loop test below: a push there is the defect this file exists to catch.
//
// The wrapper MUST be memoized on the real navigate reference: the real hook returns a stable
// function across renders, and this component's own `load` is a `useCallback` that lists
// `navigate` in its dependencies. An unmemoized wrapper hands out a fresh function identity every
// render, which retriggers the `useEffect(() => { load(); }, [load])` that follows it — an
// infinite refetch loop that silently exhausts a test's `mockOnce` queue and crashes a LATER,
// unrelated test with "Cannot read properties of undefined (reading 'then')". Caught by running
// this suite, not reasoned out in advance.
const navigateCalls = [];
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  const { useMemo } = await import('react');
  return {
    ...actual,
    useNavigate: () => {
      const realNavigate = actual.useNavigate();
      return useMemo(
        () => (...args) => {
          navigateCalls.push(args);
          return realNavigate(...args);
        },
        [realNavigate],
      );
    },
  };
});

const VideoDetectionResults = (await import('./VideoDetectionResults.jsx')).default;

const LocationProbe = () => {
  const location = useLocation();
  return (
    <p>
      landed:{location.pathname}
      {location.search} state:{location.state === null ? 'none' : JSON.stringify(location.state)}
    </p>
  );
};

// `pathname` and `search` must travel as SEPARATE fields on the initialEntries object — passing
// the combined `/path?query` string as `pathname` skips react-router's own query parsing, so the
// literal "?title=..." becomes part of the path itself and nothing matches. That bug bit the
// stale-state guard test below the moment it needed a query string AND router state on the same
// entry, which no earlier test in this file had done at once (every prior state-carrying case
// used an empty query, masking it).
const renderPage = (searchOrPath, state) =>
  render(
    <MemoryRouter
      initialEntries={[
        state
          ? { pathname: '/libraries/lib-1/add/video/results', search: searchOrPath ?? '', state }
          : `/libraries/lib-1/add/video/results${searchOrPath ?? ''}`,
      ]}
    >
      {/* The real app always has a ToastProvider above every route (App.jsx); this screen now
          confirms each save through it. */}
      <ToastProvider>
        <Routes>
          <Route path="/libraries/:libraryId/add/video/results" element={<VideoDetectionResults />} />
          <Route path="/libraries/:libraryId/add/video" element={<LocationProbe />} />
          <Route path="/libraries/:libraryId/items/new/video" element={<LocationProbe />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );

const TMDB = 'TMDB';

beforeEach(() => {
  vi.mocked(detectionApi.video).mockReset();
  vi.mocked(itemsApi.createVideo).mockReset().mockResolvedValue({ id: 'new-item' });
  vi.mocked(collectionsApi.get).mockReset().mockResolvedValue(null);
  navigateCalls.length = 0;
});

describe('VideoDetectionResults', () => {
  it("takes its own name rather than the stub row's wordmark", async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({ detectedVideos: [] });
    renderPage('?title=Nothing');
    await screen.findByRole('button', { name: /enter by hand/i });
    const header = within(document.querySelector('header'));
    expect(header.getByText('Film results')).toBeInTheDocument();
    expect(header.queryByText(/alexandria/i)).not.toBeInTheDocument();
  });

  it('re-runs the search from the query on mount — the cold-load contract for a typed title', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      detectedVideos: [{ id: 't1', title: 'Les Tontons flingueurs', directors: ['Georges Lautner'], releaseYear: 1963, duration: 105, cast: ['Lino Ventura'], source: TMDB }],
    });
    renderPage('?title=Les%20Tontons%20flingueurs');
    // The searched title now lives in the editable review field (an <input>'s VALUE, not a text
    // node), so only the candidate's own row title is a text match — one, not the two a static
    // "Searched: <title>" label used to produce when it happened to equal the candidate's title.
    expect(await screen.findAllByText('Les Tontons flingueurs')).toHaveLength(1);
    expect(screen.getByLabelText(/title/i)).toHaveValue('Les Tontons flingueurs');
    expect(detectionApi.video).toHaveBeenCalledWith({ title: 'Les Tontons flingueurs' });
  });

  it('renders director, year, runtime and cast for a candidate', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      detectedVideos: [{ id: 't1', title: 'Les Tontons flingueurs', directors: ['Georges Lautner'], releaseYear: 1963, duration: 105, cast: ['Lino Ventura', 'Bernard Blier'], source: TMDB }],
    });
    renderPage('?title=Les%20Tontons%20flingueurs');
    await screen.findAllByText('Les Tontons flingueurs');
    // Director and year share one PlateLine span (§5's Plate Line construction) — "Georges
    // Lautner" is a bare text node beside a nested `.num` year span, not its own element, so it
    // is asserted against the rendered text rather than queried as a standalone node.
    expect(document.body.textContent).toContain('Georges Lautner');
    expect(document.body.textContent).toContain('1963');
    const runtime = screen.getByText('105′');
    expect(runtime.className).toContain('num');
    expect(screen.getByText('Lino Ventura, Bernard Blier')).toBeInTheDocument();
  });

  // Fix round 1 made `location.state` unconditionally ignored, on the theory an unedited OCR
  // title's answer could not be reproduced from a URL — traced against the backend and found
  // false. Fix round 2 (the one-call-capture task) brings state BACK, but only as a fast path
  // gated on the query: see the two tests below this one. This test's own scenario — no
  // `?title=` at all — is untouched by that reintroduction, because the redirect-on-missing-
  // title branch runs before state is ever consulted; renamed (not deleted, ui-v3.md §7's own
  // rule on a forbidding test) to say what is actually still true: a query is what makes a
  // search reproducible, and state can never substitute for one that is entirely absent.
  it('a location.state payload with no `?title=` in the query still redirects — the query is what recovers, state never substitutes for it', async () => {
    const candidates = [{ id: 't1', title: 'Le Trou', directors: ['Jacques Becker'], releaseYear: 1960, duration: 132, cast: [], source: TMDB, pictureUrl: '/c4.webp' }];
    renderPage('', { candidates, forTitle: 'Le Trou' });
    expect(
      await screen.findByText('landed:/libraries/lib-1/add/video state:{"noInput":true}'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Le Trou')).not.toBeInTheDocument();
    expect(detectionApi.video).not.toHaveBeenCalled();
  });

  // The reinstated fast path (fix round 2): AddVideo already ran this exact search — capture or
  // typed — and hands the candidates it already paid for over via `state`, tagged with the title
  // they answer (`forTitle`). When that tag matches the query title on screen, this component
  // must render them WITHOUT a second network call — the whole point of carrying them at all.
  // Written against the code before the fix; expected to fail (state is read nowhere yet), see
  // the report for the verbatim before/after run.
  it('renders location.state candidates with no network call when they match the query title', async () => {
    const candidates = [{ id: 't1', title: 'Le Samouraï', directors: ['Melville'], releaseYear: 1967, duration: 105, cast: [], source: TMDB }];
    // A safety net for the pre-fix run only: the code under test today reads state nowhere, so
    // it WILL hit the network — mocked here so that run fails cleanly on the assertion below
    // rather than crashing on an unmocked call returning `undefined`.
    vi.mocked(detectionApi.video).mockResolvedValue({ detectedVideos: candidates });
    renderPage('?title=Le%20Samoura%C3%AF', { candidates, forTitle: 'Le Samouraï' });
    await screen.findAllByText('Le Samouraï');
    expect(detectionApi.video).not.toHaveBeenCalled();
  });

  // The guard against the exact silent-regression shape ui-v3.md §7 warns about: forwarding
  // `location.state` on top of an already-correct query is only safe while the state actually
  // answers that query. A stale payload (a different title than the one in the URL — browser
  // back/forward, or a corrected search that changed the query without this remounting) must be
  // ignored and re-fetched, never rendered as though it answered the title on screen.
  it('ignores location.state candidates tagged for a DIFFERENT title than the query — a stale fast path must not answer the wrong question', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      detectedVideos: [{ id: 't2', title: 'Nouveau titre', directors: [], releaseYear: 2020, duration: 90, cast: [], source: TMDB }],
    });
    const staleCandidates = [{ id: 't1', title: 'Ancien titre', directors: [], releaseYear: 1990, duration: 80, cast: [], source: TMDB }];
    renderPage('?title=Nouveau%20titre', { candidates: staleCandidates, forTitle: 'Ancien titre' });
    await screen.findAllByText('Nouveau titre');
    expect(screen.queryByText('Ancien titre')).not.toBeInTheDocument();
    expect(detectionApi.video).toHaveBeenCalledWith({ title: 'Nouveau titre' });
  });

  // The other half of the call-count discipline the task brief asks for: the reader's own
  // correction of an OCR misread, made HERE rather than by walking back to AddVideo, costs
  // exactly one more call — not a second load of the ORIGINAL title plus a search of the
  // corrected one. Written against the code before the fix (no editable field exists yet);
  // expected to fail, see the report.
  it('editing the extracted title and searching again makes exactly one more call, for the corrected title', async () => {
    const candidates = [{ id: 't1', title: 'Le Samouraï', directors: ['Melville'], releaseYear: 1967, duration: 105, cast: [], source: TMDB }];
    // Same pre-fix safety net as the test above: today's code always fetches, so give it
    // something to resolve rather than crash on.
    vi.mocked(detectionApi.video).mockResolvedValue({ detectedVideos: candidates });
    renderPage('?title=Le%20Samoura%C3%AF', { candidates, forTitle: 'Le Samouraï' });
    await screen.findAllByText('Le Samouraï');
    expect(detectionApi.video).not.toHaveBeenCalled();

    vi.mocked(detectionApi.video).mockResolvedValueOnce({
      detectedVideos: [{ id: 't2', title: 'Le Samourai', directors: ['Melville'], releaseYear: 1967, duration: 105, cast: [], source: TMDB }],
    });
    await userEvent.clear(screen.getByLabelText(/title/i));
    await userEvent.type(screen.getByLabelText(/title/i), 'Le Samourai');
    await userEvent.click(screen.getByRole('button', { name: /look up this title/i }));

    await screen.findAllByText('Le Samourai');
    expect(detectionApi.video).toHaveBeenCalledTimes(1);
    expect(detectionApi.video).toHaveBeenCalledWith({ title: 'Le Samourai' });
  });

  // The searched title used to be a static caps label with its own `data-mark`. It is now the
  // editable review field's value (one-call-capture task) — plain text input, no mono class
  // anywhere near it, which is the same "content, not a numeral" guarantee §3 asked for, just
  // enforced by the field never having a mono option rather than by a class assertion on a span
  // that no longer exists.
  it('prints the searched title once, at the head, as an editable field pre-filled from the query', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      detectedVideos: [{ id: 't1', title: 'Inception', directors: ['Christopher Nolan'], releaseYear: 2010, duration: 148, cast: [], source: TMDB }],
    });
    renderPage('?title=Inception');
    await screen.findAllByText('Inception');
    const searched = screen.getByLabelText(/title/i);
    expect(searched).toHaveValue('Inception');
    expect(searched.className).not.toContain('num');
  });

  it('shows a failed resolver as a ruled failure note, never a candidate — the true-miss shape', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      detectedVideos: [{ id: '', title: '', directors: null, cast: null, releaseYear: 0, duration: 0, tmdbId: '', source: TMDB, error: 'No movies found for title: Film Sans Correspondance TMDB' }],
    });
    renderPage('?title=Film%20Sans%20Correspondance%20TMDB');
    expect(await screen.findByText(/no match found/i)).toBeInTheDocument();
    expect(screen.getByText(/tmdb.*no answer/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /use this/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/untitled/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
  });

  it('does not offer manual entry while even one usable candidate is present, one resolver having failed', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      detectedVideos: [
        { id: 't1', title: 'Les Tontons flingueurs', directors: ['Georges Lautner'], releaseYear: 1963, duration: 105, cast: [], source: TMDB, pictureUrl: '/c5.webp' },
      ],
    });
    renderPage('?title=Les%20Tontons%20flingueurs');
    await screen.findAllByText('Les Tontons flingueurs');
    expect(screen.queryByText(/no match found/i)).not.toBeInTheDocument();
  });

  it('offers manual entry on the rarer fully-empty response too', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({});
    renderPage('?title=Film%20Introuvable%20XYZ');
    expect(await screen.findByText(/no match found/i)).toBeInTheDocument();
  });

  it('carries the searched title through to manual entry so it is never typed twice', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({});
    renderPage('?title=Film%20Introuvable%20XYZ&collectionId=c1');
    await userEvent.click(await screen.findByRole('button', { name: /enter by hand/i }));
    expect(
      await screen.findByText(
        'landed:/libraries/lib-1/items/new/video?title=Film+Introuvable+XYZ&collectionId=c1 state:none',
      ),
    ).toBeInTheDocument();
  });

  describe('pictureUrl has three shapes, and only truthiness tells them apart', () => {
    it('renders the ruled empty frame when pictureUrl is absent entirely', async () => {
      vi.mocked(detectionApi.video).mockResolvedValue({
        detectedVideos: [{ id: 't3', title: 'Sans affiche', directors: ['Anon'], releaseYear: 1963, duration: 105, cast: [], source: TMDB }],
      });
      renderPage('?title=Sans%20affiche');
      await screen.findAllByText('Sans affiche');
      expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    });

    it('renders the ruled empty frame when pictureUrl is present but the empty string', async () => {
      vi.mocked(detectionApi.video).mockResolvedValue({
        detectedVideos: [{ id: 't3', title: 'Vide', directors: ['Anon'], releaseYear: 2000, duration: 90, cast: [], source: TMDB, pictureUrl: '' }],
      });
      renderPage('?title=Vide');
      await screen.findAllByText('Vide');
      expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    });

    it('renders the cover image when pictureUrl is a real address', async () => {
      vi.mocked(detectionApi.video).mockResolvedValue({
        detectedVideos: [{ id: 't1', title: 'Inception', directors: ['Nolan'], releaseYear: 2010, duration: 148, cast: [], source: TMDB, pictureUrl: '/mock-thumbnails/cover-1.webp' }],
      });
      renderPage('?title=Inception');
      await screen.findAllByText('Inception');
      expect(screen.getByRole('presentation')).toHaveAttribute('src', '/mock-thumbnails/cover-1.webp');
    });
  });

  it('prints FILING INTO with the collection name, never uppercased', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      detectedVideos: [{ id: 't1', title: 'Inception', directors: ['Nolan'], releaseYear: 2010, duration: 148, cast: [], source: TMDB }],
    });
    vi.mocked(collectionsApi.get).mockResolvedValue({ id: 'c1', name: 'Blake et Mortimer', itemCount: 4 });
    renderPage('?title=Inception&collectionId=c1');
    expect(await screen.findByText(/^filing into$/i)).toBeInTheDocument();
    const name = screen.getByText('Blake et Mortimer', { selector: '[data-mark="filing-into-name"]' });
    expect(name.className).toContain('normal-case');
  });

  it('writes nothing until the reader confirms a candidate, then loops back to AddVideo via replace', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      detectedVideos: [{ id: 't1', title: 'Inception', summary: 'A thief.', directors: ['Nolan'], cast: ['DiCaprio'], releaseYear: 2010, duration: 148, tmdbId: '27205', source: TMDB, pictureUrl: '/c1.webp' }],
    });
    renderPage('?title=Inception&collectionId=c1');
    await screen.findAllByText('Inception');
    expect(itemsApi.createVideo).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /use this/i }));

    expect(itemsApi.createVideo).toHaveBeenCalledWith('lib-1', expect.objectContaining({
      title: 'Inception',
      directors: ['Nolan'],
      cast: ['DiCaprio'],
      releaseYear: 2010,
      duration: 148,
      tmdbId: '27205',
      pictureUrl: '/c1.webp',
      collectionId: 'c1',
    }));
    expect(
      await screen.findByText('landed:/libraries/lib-1/add/video?collectionId=c1 state:none'),
    ).toBeInTheDocument();
    // The defect this test guards: a `push` here leaves the just-spent results page reachable
    // by pressing back from the capture screen it loops to. Only `replace` retires it — the
    // DESTINATION alone (asserted above) cannot tell the two apart, since `location` looks
    // identical either way.
    const loopNavigation = navigateCalls.find(([path]) =>
      path.startsWith('/libraries/lib-1/add/video?'),
    );
    expect(loopNavigation?.[1]).toEqual(expect.objectContaining({ replace: true }));
  });

  it('confirms the save, so filing is never silent', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      detectedVideos: [{ id: 't1', title: 'Le Samouraï', directors: ['Melville'], releaseYear: 1967, source: TMDB }],
    });
    renderPage('?title=Le%20Samoura%C3%AF');
    await screen.findByText('Le Samouraï');

    await userEvent.click(screen.getByRole('button', { name: /use this/i }));

    // Same P0 as the book side, same reasoning — see BookDetectionResults.test.jsx. Scoped to
    // the toast's own hook because the title also renders in the candidate row above it.
    const toast = await screen.findByText(/samoura/i, { selector: '[data-toast]' });
    expect(toast).toBeInTheDocument();
  });

  it('reports a failed save in place rather than navigating away on it', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      detectedVideos: [{ id: 't1', title: 'Inception', directors: ['Nolan'], releaseYear: 2010, duration: 148, cast: [], source: TMDB }],
    });
    vi.mocked(itemsApi.createVideo).mockRejectedValueOnce(new Error('That request was not accepted.'));
    renderPage('?title=Inception');
    await userEvent.click(await screen.findByRole('button', { name: /use this/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/that request was not accepted/i);
    expect(screen.queryByText(/^landed:/)).not.toBeInTheDocument();
  });

  it('surfaces a transport failure with a retry control, distinct from a true miss', async () => {
    vi.mocked(detectionApi.video).mockRejectedValueOnce(new Error('Something went wrong on our side.'));
    renderPage('?title=TRIGGER_NETWORK_ERROR');
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.queryByText(/no match found/i)).not.toBeInTheDocument();

    vi.mocked(detectionApi.video).mockResolvedValueOnce({
      detectedVideos: [{ id: 't1', title: 'Inception', directors: ['Nolan'], releaseYear: 2010, duration: 148, cast: [], source: TMDB }],
    });
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Inception')).toBeInTheDocument();
  });

  // `Try again` did not try again. After a failed re-search the URL is unchanged, so the tagged
  // state still matched the title on screen and `load()` re-served the PREVIOUS candidates as
  // `ready` — a control labelled with a specific action presenting stale results as fresh, which
  // is the rule §7 records as already learned on item detail and which shipped again four screens
  // later on this one.
  it('a retry after a failed re-search fetches again instead of re-serving the tagged candidates', async () => {
    const carried = [{ id: 't1', title: 'Le Samouraï', directors: ['Melville'], releaseYear: 1967, duration: 105, cast: [], source: TMDB }];
    renderPage('?title=Le%20Samoura%C3%AF', { candidates: carried, forTitle: 'Le Samouraï' });
    await screen.findAllByText('Le Samouraï');
    expect(detectionApi.video).not.toHaveBeenCalled();

    // The reader corrects the title and the network fails. The URL still carries the ORIGINAL
    // title, so the tag still matches — which is exactly the trap.
    vi.mocked(detectionApi.video).mockRejectedValueOnce(new Error('Something went wrong on our side.'));
    await userEvent.clear(screen.getByLabelText(/title/i));
    await userEvent.type(screen.getByLabelText(/title/i), 'Le Trou');
    await userEvent.click(screen.getByRole('button', { name: /look up this title/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);

    vi.mocked(detectionApi.video).mockResolvedValueOnce({
      detectedVideos: [{ id: 't9', title: 'Le Trou', directors: ['Becker'], releaseYear: 1960, duration: 132, cast: [], source: TMDB }],
    });
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    // The discriminating observable is what comes BACK, not the call count: the old code also
    // "handled" the retry, by rendering the stale candidate as though it were a fresh answer.
    expect(await screen.findByText('Le Trou')).toBeInTheDocument();
    expect(screen.queryByText('Le Samouraï')).not.toBeInTheDocument();
  });

  // The hint asserted a mechanism that had not run. This screen is reached three ways — a captured
  // cover, a hand-typed title, and the camera-denied fallback — and it read "OCR can misread a
  // cover" on all of them, telling a reader who typed the title that a camera had misread it.
  it('never blames OCR for a title the reader typed', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({ detectedVideos: [] });
    renderPage('?title=Inception');
    await screen.findByText(/no match found/i);
    expect(screen.queryByText(/ocr/i)).not.toBeInTheDocument();
    // The correction affordance is still explained where it matters — on a miss.
    expect(screen.getByText(/correct the title and search again/i)).toBeInTheDocument();
  });

  it('drops the hint once candidates are on screen — the answer outranks the correction', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      detectedVideos: [{ id: 't1', title: 'Le Samouraï', directors: ['Melville'], releaseYear: 1967, duration: 105, cast: [], source: TMDB }],
    });
    renderPage('?title=Le%20Samoura%C3%AF');
    await screen.findAllByText('Le Samouraï');
    // On a hit the head is the field alone. The field itself stays, because correcting a misread
    // is still the next move when the candidates are wrong — it just stops shouting over them.
    expect(screen.queryByText(/correct the title and search again/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  // §4: the row carries recognition, detail carries identification. A cast line discriminates
  // through its LEAD — nobody chooses on the fourth and fifth names — so the field is the first
  // two, and NOTHING IS TRUNCATED because the field is defined shorter than the data rather than
  // clipping a string. `truncate` cut mid-word ("Nathalie D…"); letting all five wrap is the other
  // wrong answer, at three lines per row across five rows on a comparison screen.
  it('prints the first two cast names, cut by definition rather than by ellipsis', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      detectedVideos: [{
        id: 't1',
        title: 'Le Samouraï',
        directors: ['Jean-Pierre Melville'],
        releaseYear: 1967,
        duration: 105,
        cast: ['Alain Delon', 'François Périer', 'Nathalie Delon', 'Cathy Rosier', 'Jacques Leroy'],
        source: TMDB,
      }],
    });
    renderPage('?title=Le%20Samoura%C3%AF');
    const cast = await screen.findByText('Alain Delon, François Périer');
    expect(cast).toBeInTheDocument();
    // Not merely "the first two are present": the third must be ABSENT, or a test would pass on
    // the full join. And no `truncate`, so the browser is not clipping what the field kept.
    expect(screen.queryByText(/Nathalie Delon/)).not.toBeInTheDocument();
    expect(cast).not.toHaveClass('truncate');
  });

  // Video has one resolver, so `TMDB` is a constant: five identical labels down a five-row list,
  // five copies of one fact differentiating nothing — "nothing is labelled twice" applied
  // vertically. It stays on the book rows, where it varies, and on the failure notes here, where
  // naming WHICH resolver did not answer is the note's whole content.
  it('does not badge a successful candidate with its source, because film has only one', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      detectedVideos: [{ id: 't1', title: 'Le Samouraï', directors: ['Melville'], releaseYear: 1967, duration: 105, cast: [], source: TMDB }],
    });
    renderPage('?title=Le%20Samoura%C3%AF');
    await screen.findByText('Le Samouraï');
    expect(screen.queryByText(TMDB)).not.toBeInTheDocument();
  });

  it('still names the resolver on a failure note, where it is the whole point', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      detectedVideos: [{ id: 't1', source: TMDB, error: 'No movies found for title: Inconnu' }],
    });
    renderPage('?title=Inconnu');
    await screen.findByText(/no match found/i);
    // The note reads "TMDB — no answer": the source is the content here, not a badge.
    expect(screen.getByText(/tmdb — no answer/i)).toBeInTheDocument();
  });

  // A bare `/add/video/results` with no `?title=` is a genuinely reachable dead end — routes.jsx's
  // `guard()` checks only that a user is signed in, not that the query it lands on makes sense —
  // reachable by a typed, edited, or bookmarked-mid-flow URL. Redirects to AddVideo with the
  // shared, type-agnostic `noInput` state rather than spinning forever.
  it('redirects to AddVideo with the shared no-input state when nothing was carried through', async () => {
    renderPage();
    expect(
      await screen.findByText('landed:/libraries/lib-1/add/video state:{"noInput":true}'),
    ).toBeInTheDocument();
    expect(detectionApi.video).not.toHaveBeenCalled();
  });

  it('carries the collection into the same redirect', async () => {
    renderPage('?collectionId=c1');
    expect(
      await screen.findByText(
        'landed:/libraries/lib-1/add/video?collectionId=c1 state:{"noInput":true}',
      ),
    ).toBeInTheDocument();
  });
});
