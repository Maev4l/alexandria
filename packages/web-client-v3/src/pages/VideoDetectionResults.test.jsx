import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const renderPage = (searchOrPath, state) =>
  render(
    <MemoryRouter
      initialEntries={[
        state
          ? { pathname: `/libraries/lib-1/add/video/results${searchOrPath ?? ''}`, state }
          : `/libraries/lib-1/add/video/results${searchOrPath ?? ''}`,
      ]}
    >
      <Routes>
        <Route path="/libraries/:libraryId/add/video/results" element={<VideoDetectionResults />} />
        <Route path="/libraries/:libraryId/add/video" element={<LocationProbe />} />
        <Route path="/libraries/:libraryId/items/new/video" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

const TMDB = 'TMDB';

beforeEach(() => {
  vi.mocked(detectionApi.video).mockReset();
  vi.mocked(itemsApi.createVideo).mockReset().mockResolvedValue({ id: 'new-item' });
  vi.mocked(collectionsApi.get).mockReset().mockResolvedValue(null);
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
    // Two matches by design: the searched title at the head (§ ruling 4) and the candidate's own
    // title on its row — the same construction BookDetectionResults hits whenever a candidate's
    // title happens to equal the scanned input, and why it also reaches for findAllByText/getAllByText
    // rather than a singular query wherever that overlap is possible.
    expect(await screen.findAllByText('Les Tontons flingueurs')).toHaveLength(2);
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

  // Fix round 1: this screen used to accept a captured search's candidates via `location.state`
  // to avoid a second network call, on the theory an unedited OCR title's answer could not be
  // reproduced from a URL. Traced against the backend and found false (see AddVideo.test.jsx's
  // own comment on the same finding) — `location.state` is no longer read here at all. Proven by
  // showing the OLD mechanism no longer works, not merely that the new one does: a state payload
  // with candidates but no `?title=` must still redirect, exactly as if the state were absent.
  it('ignores a location.state candidate payload entirely — a query is the only accepted input now', async () => {
    const candidates = [{ id: 't1', title: 'Le Trou', directors: ['Jacques Becker'], releaseYear: 1960, duration: 132, cast: [], source: TMDB, pictureUrl: '/c4.webp' }];
    renderPage('', { candidates, searchedTitle: 'Le Trou' });
    expect(
      await screen.findByText('landed:/libraries/lib-1/add/video state:{"noInput":true}'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Le Trou')).not.toBeInTheDocument();
    expect(detectionApi.video).not.toHaveBeenCalled();
  });

  it('prints the searched title once, at the head, in the sans — never the mono, since it is content not a numeral', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      detectedVideos: [{ id: 't1', title: 'Inception', directors: ['Christopher Nolan'], releaseYear: 2010, duration: 148, cast: [], source: TMDB }],
    });
    renderPage('?title=Inception');
    await screen.findAllByText('Inception');
    const searched = screen.getByText('Inception', { selector: '[data-mark="searched-title"]' });
    expect(searched.className).not.toContain('num');
    expect(searched.className).toContain('normal-case');
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

  it('writes nothing until the reader confirms a candidate, then loops back to AddVideo', async () => {
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
