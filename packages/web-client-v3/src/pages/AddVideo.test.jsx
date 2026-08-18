import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collectionsApi, detectionApi } from '@/api';
import { NO_INPUT_MESSAGE } from '@/lib/addFlowState.js';

// The camera is mocked: jsdom has no getUserMedia, and the behaviour under test here is
// AddVideo's own state (the editable title, the escape hatch, the unified typed/OCR search path),
// not the capture mechanism itself (that lives in CoverCapture.test.jsx, layer 1 of the three the
// task brief names). "simulate capture" drives the same onCapture callback a real shutter press
// would.
vi.mock('@/components/CoverCapture.jsx', () => ({
  default: ({ onCapture, onError }) => (
    <div>
      <button type="button" onClick={() => onError(new Error('NotAllowedError'))}>
        simulate denial
      </button>
      <button type="button" onClick={() => onCapture('fake-cover-frame')}>
        simulate capture
      </button>
    </div>
  ),
}));

vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    detectionApi: { ...actual.detectionApi, video: vi.fn() },
    collectionsApi: { ...actual.collectionsApi, get: vi.fn() },
  };
});

const AddVideo = (await import('./AddVideo.jsx')).default;

// Prints the route it landed on, its full query, and its router state, so a test can assert
// exactly which mechanism carried the reader forward — every search, typed or OCR-derived,
// travels in the query now (fix round 1), so `state` should read `none` on every path here.
const LocationProbe = () => {
  const location = useLocation();
  return (
    <p>
      landed:{location.pathname}
      {location.search} state:{location.state === null ? 'none' : JSON.stringify(location.state)}
    </p>
  );
};

const renderPage = (initialPath = '/libraries/lib-1/add/video', initialState) =>
  render(
    <MemoryRouter
      initialEntries={[
        initialState ? { pathname: initialPath, state: initialState } : initialPath,
      ]}
    >
      <Routes>
        <Route path="/libraries/:libraryId/add/video" element={<AddVideo />} />
        <Route path="/libraries/:libraryId/add/video/results" element={<LocationProbe />} />
        <Route path="/libraries/:libraryId/items/new/video" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(detectionApi.video).mockReset();
  vi.mocked(collectionsApi.get).mockReset().mockResolvedValue(null);
});

describe('AddVideo', () => {
  it('offers title search without ever opening the camera', () => {
    renderPage();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeEnabled();
  });

  // Fix round 3 (design-session finding 1): a cataloguing session SITS on this screen for the
  // whole session and only passes THROUGH the candidate list once per capture, so FILING INTO
  // belongs here at least as much as there — it must survive being ignored across many captures,
  // which is exactly the property a mark shown only on the screen that flashes past does not
  // have. Its absence is what says "standalone", so both directions are asserted.
  it('prints FILING INTO with the collection name when the session carries one', async () => {
    vi.mocked(collectionsApi.get).mockResolvedValue({ id: 'c1', name: 'Blake et Mortimer', itemCount: 4 });
    renderPage('/libraries/lib-1/add/video?collectionId=c1');
    expect(await screen.findByText(/^filing into$/i)).toBeInTheDocument();
    const name = screen.getByText('Blake et Mortimer', { selector: '[data-mark="filing-into-name"]' });
    expect(name.className).toContain('normal-case');
    expect(collectionsApi.get).toHaveBeenCalledWith('lib-1', 'c1');
  });

  it('prints no FILING INTO mark at all when the session is standalone', () => {
    renderPage();
    expect(screen.queryByText(/filing into/i)).not.toBeInTheDocument();
    expect(collectionsApi.get).not.toHaveBeenCalled();
  });

  it('shows the OCR result as an editable field, because OCR is fallible', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      extractedTitle: 'Le Samouraï',
      detectedVideos: [{ id: 't1', title: 'Le Samouraï', source: 'TMDB' }],
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /simulate capture/i }));
    const title = await screen.findByLabelText(/title/i);
    expect(title).toHaveValue('Le Samouraï');
    expect(title).toBeEnabled();
    expect(detectionApi.video).toHaveBeenCalledWith({ image: 'fake-cover-frame' });
  });

  it('says what to do when the camera is refused, rather than only that it failed', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /simulate denial/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/type the title/i);
  });

  it('says so in place when OCR reads nothing legible, distinct from a network failure', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({});
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /simulate capture/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no title could be read/i);
    expect(screen.getByLabelText(/title/i)).toHaveValue('');
  });

  // Round 2 tried a caps reason ("A film's title") standing in for the disabled button, to
  // distinguish it at rest from the always-enabled "Enter by hand" secondary beside it — same
  // 2px ink outline, same transparent ground. The user looked at the running app and found the
  // reason itself the defect: the field is already labelled Title and hinted, and a bare caps
  // noun phrase reads as a heading for the control beneath it, not an explanation of an absent
  // one. The real fix moves "Enter by hand" off the outline treatment entirely (see the link
  // test below), which dissolves the collision at its source: the disabled "Look it up" becomes
  // the only ruled outline in its row, so DESIGN.md §6's FIRST form — a plain disabled outline,
  // no words — applies correctly, and the button itself, not a caps stand-in, is what proves the
  // state.
  it('disables Look it up while the title is empty, and calls nothing on Enter', async () => {
    renderPage();
    expect(screen.getByRole('button', { name: /look it up/i })).toBeDisabled();
    expect(screen.queryByText(/a film's title/i)).not.toBeInTheDocument();
    screen.getByLabelText(/title/i).focus();
    await userEvent.keyboard('{Enter}');
    expect(detectionApi.video).not.toHaveBeenCalled();
  });

  it('enables Look it up once a title is typed', async () => {
    renderPage();
    const field = screen.getByLabelText(/title/i);
    expect(screen.getByRole('button', { name: /^look it up$/i })).toBeDisabled();

    await userEvent.type(field, 'Inception');
    expect(screen.getByRole('button', { name: /^look it up$/i })).toBeEnabled();
  });

  // Fix round 1: an unedited OCR title used to skip straight to the results screen via
  // `location.state`, carrying the candidates the `{ image }` call already returned, to avoid a
  // second network round trip. Review traced `handlers/detection.go`'s `handleVideoDetection`
  // through `services/lookup_video.go` to `tmdb.go`'s `ResolveByTitle` and found a typed title and
  // an OCR-extracted title feed the identical call — same title in, same candidates out — so the
  // "saved" round trip bought nothing and cost every reload on the results route its ability to
  // recover. An unedited OCR title now takes the exact same query-based path as a typed one.
  it('an unedited OCR title is a query-based search too, with no router state', async () => {
    vi.mocked(detectionApi.video).mockResolvedValueOnce({
      extractedTitle: 'Le Samouraï',
      detectedVideos: [{ id: 't1', title: 'Le Samouraï', source: 'TMDB' }],
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /simulate capture/i }));
    await screen.findByDisplayValue('Le Samouraï');

    vi.mocked(detectionApi.video).mockResolvedValueOnce({
      detectedVideos: [{ id: 't1', title: 'Le Samouraï', source: 'TMDB' }],
    });
    await userEvent.click(screen.getByRole('button', { name: /look it up/i }));

    // A second call DOES happen now — deliberately, per the finding above.
    expect(detectionApi.video).toHaveBeenLastCalledWith({ title: 'Le Samouraï' });
    expect(
      await screen.findByText(
        'landed:/libraries/lib-1/add/video/results?title=Le+Samoura%C3%AF state:none',
      ),
    ).toBeInTheDocument();
  });

  it('an OCR title the reader edits is a fresh typed search, carried in the query with no state', async () => {
    vi.mocked(detectionApi.video).mockResolvedValueOnce({
      extractedTitle: 'Le Trou',
      detectedVideos: [{ id: 'x', title: 'Le Trou', source: 'TMDB' }],
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /simulate capture/i }));
    await screen.findByDisplayValue('Le Trou');

    const field = screen.getByLabelText(/title/i);
    await userEvent.clear(field);
    await userEvent.type(field, 'Le Trou 1960');

    vi.mocked(detectionApi.video).mockResolvedValueOnce({
      detectedVideos: [{ id: 'y', title: 'Le Trou', source: 'TMDB' }],
    });
    await userEvent.click(screen.getByRole('button', { name: /look it up/i }));

    expect(detectionApi.video).toHaveBeenLastCalledWith({ title: 'Le Trou 1960' });
    expect(
      await screen.findByText(
        'landed:/libraries/lib-1/add/video/results?title=Le+Trou+1960 state:none',
      ),
    ).toBeInTheDocument();
  });

  it('a hand-typed title with no camera at all is a query-based search too', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({
      detectedVideos: [{ id: 'z', title: 'Inception', source: 'TMDB' }],
    });
    renderPage();
    await userEvent.type(screen.getByLabelText(/title/i), 'Inception');
    await userEvent.click(screen.getByRole('button', { name: /look it up/i }));
    expect(detectionApi.video).toHaveBeenCalledWith({ title: 'Inception' });
    expect(
      await screen.findByText('landed:/libraries/lib-1/add/video/results?title=Inception state:none'),
    ).toBeInTheDocument();
  });

  it('carries the collection through into the results query alongside a typed title', async () => {
    vi.mocked(detectionApi.video).mockResolvedValue({ detectedVideos: [] });
    renderPage('/libraries/lib-1/add/video?collectionId=c1');
    await userEvent.type(screen.getByLabelText(/title/i), 'Inception');
    await userEvent.click(screen.getByRole('button', { name: /look it up/i }));
    expect(
      await screen.findByText(
        'landed:/libraries/lib-1/add/video/results?title=Inception&collectionId=c1 state:none',
      ),
    ).toBeInTheDocument();
  });

  it('does not navigate away when the title search itself fails, and explains why in place', async () => {
    vi.mocked(detectionApi.video).mockRejectedValueOnce(
      new Error('Could not reach the server. Check your connection and try again.'),
    );
    renderPage();
    await userEvent.type(screen.getByLabelText(/title/i), 'Inception');
    await userEvent.click(screen.getByRole('button', { name: /look it up/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);
    expect(screen.queryByText(/^landed:/)).not.toBeInTheDocument();
  });

  // Fix round 1: a bare `/add/video/results` with no `?title=` is a genuinely reachable dead end
  // (routes.jsx's `guard()` checks only that a user is signed in) — but now that OCR and typed
  // searches are unified, there is no photo anywhere in this flow's recovery path, so the message
  // must not claim one was lost. Asserted against the exact shared string, not a substring of one
  // word, so a rewrite that keeps "photo" out but drifts from the agreed copy still fails.
  it('prints the shared no-input message when redirected back here with nothing to resolve', () => {
    renderPage('/libraries/lib-1/add/video', { noInput: true });
    expect(screen.getByText(NO_INPUT_MESSAGE)).toBeInTheDocument();
  });

  it('still offers Enter by hand, unrelated to any title search state, and carries the collection through its own query', async () => {
    renderPage('/libraries/lib-1/add/video?collectionId=c1');
    await userEvent.click(screen.getByRole('link', { name: /^enter by hand$/i }));
    expect(
      await screen.findByText('landed:/libraries/lib-1/items/new/video?collectionId=c1 state:none'),
    ).toBeInTheDocument();
  });

  it('sends no query at all into Enter by hand with no collection on its own URL', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('link', { name: /^enter by hand$/i }));
    expect(
      await screen.findByText('landed:/libraries/lib-1/items/new/video state:none'),
    ).toBeInTheDocument();
  });

  // ui-v3.md §2, the stub row: back + wordmark is correct only while a screen has nothing to call
  // itself. Scoped to the header, per AddBook.test.jsx's own comment on why an unscoped query
  // cannot tell "title shown" apart from "title dropped, h1 still there".
  it("takes its own name rather than the stub row's wordmark", () => {
    renderPage();
    const header = within(document.querySelector('header'));
    expect(header.getByText('Add a film')).toBeInTheDocument();
    expect(header.queryByText(/alexandria/i)).not.toBeInTheDocument();
  });
});
