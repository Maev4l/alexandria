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
    detectionApi: { ...actual.detectionApi, book: vi.fn() },
    itemsApi: { ...actual.itemsApi, createBook: vi.fn() },
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

const BookDetectionResults = (await import('./BookDetectionResults.jsx')).default;

const LocationProbe = () => {
  const location = useLocation();
  return (
    <p>
      landed:{location.pathname}
      {location.search} state:{location.state === null ? 'none' : JSON.stringify(location.state)}
    </p>
  );
};

const renderPage = (search) =>
  render(
    <MemoryRouter initialEntries={[`/libraries/lib-1/add/book/results${search}`]}>
      <ToastProvider>
      <Routes>
        <Route path="/libraries/:libraryId/add/book/results" element={<BookDetectionResults />} />
        <Route path="/libraries/:libraryId/add/book" element={<LocationProbe />} />
        <Route path="/libraries/:libraryId/items/new/book" element={<LocationProbe />} />
      </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );

// Exact resolver names the real backend emits (services/resolvers/*.go), matching
// tools/mock-detections.js's own fixtures — a source badge showing a fixture-only label would
// never appear against the real API.
const GOOGLE = 'Google';
const BABELIO = 'Babelio';
const GOODREADS = 'Goodreads';

beforeEach(() => {
  vi.mocked(detectionApi.book).mockReset();
  vi.mocked(itemsApi.createBook).mockReset().mockResolvedValue({ id: 'new-item' });
  vi.mocked(collectionsApi.get).mockReset().mockResolvedValue(null);
  navigateCalls.length = 0;
});

describe('BookDetectionResults', () => {
  it("takes its own name rather than the stub row's wordmark", async () => {
    vi.mocked(detectionApi.book).mockResolvedValue({ detectedBooks: [] });
    render(
      <MemoryRouter initialEntries={['/libraries/lib-1/add/book/results?isbn=9780000000000']}>
        <ToastProvider>
        <Routes>
          <Route path="/libraries/:libraryId/add/book/results" element={<BookDetectionResults />} />
        </Routes>
        </ToastProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('button', { name: /enter by hand/i });
    // See AddBook.test.jsx's identical assertion and its own comment for why this must be
    // scoped to the header rather than a page-wide `getByText`/`getAllByText`: the sr-only <h1>
    // is permanent and independent of `<AppHeader>`'s `title` prop, so an unscoped query cannot
    // tell "title shown" apart from "title dropped, h1 still there" (fix round 1, finding 2).
    const header = within(document.querySelector('header'));
    expect(header.getByText('Book results')).toBeInTheDocument();
    expect(header.queryByText(/alexandria/i)).not.toBeInTheDocument();
  });

  it('re-runs detection from the query on mount — the cold-load contract', async () => {
    vi.mocked(detectionApi.book).mockResolvedValue({
      detectedBooks: [{ id: 'g1', title: 'Le Petit Prince', authors: ['Saint-Exupéry'], isbn: '123', pictureUrl: '/c.webp', source: GOOGLE }],
    });
    renderPage('?isbn=9782070408504');
    expect(await screen.findByText('Le Petit Prince')).toBeInTheDocument();
    expect(detectionApi.book).toHaveBeenCalledWith('9782070408504');
  });

  // Fix round 2, finding 2: the scanned code used to print on every candidate row (the
  // reader's own code echoed back three times over, differentiating nothing) — it now lives
  // once, at the head of the list, in the mono. §3 reserves the mono face for numerals, and the
  // looked-up code is the canonical case (PlateLine.jsx's own ISBN treatment, the site round 1
  // copied from, applies the same class).
  it('prints the scanned code once, in the mono, at the head — never repeated on any row', async () => {
    vi.mocked(detectionApi.book).mockResolvedValue({
      detectedBooks: [
        { id: 'g1', title: "L'Étranger", authors: ['Camus'], isbn: '9782070360024', pictureUrl: '/c1.webp', source: GOOGLE },
        { id: '', title: '', authors: null, isbn: '9782070360024', source: BABELIO, error: 'Unavailable - Try later.' },
        { id: 'gr1', title: "L'Étranger", authors: ['Camus'], isbn: '9782070360024', pictureUrl: '/c3.webp', source: GOODREADS },
      ],
    });
    renderPage('?isbn=9782070360024');
    await screen.findAllByText("L'Étranger");
    // `getByText` throws on more than one match — this alone proves the code is on screen
    // exactly once, not once per candidate as it used to be.
    const code = screen.getByText('9782070360024');
    expect(code.className).toContain('num');
    expect(code.dataset.mark).toBe('lookup-code');
  });

  it('shows a failed resolver as a ruled failure note beside ones that succeeded — never a candidate', async () => {
    vi.mocked(detectionApi.book).mockResolvedValue({
      detectedBooks: [
        { id: 'g1', title: "L'Étranger", authors: ['Camus'], isbn: '9782070360024', pictureUrl: '/c1.webp', source: GOOGLE },
        { id: '', title: '', authors: null, isbn: '9782070360024', source: BABELIO, error: 'Unavailable - Try later.' },
        { id: 'gr1', title: "L'Étranger", authors: ['Camus'], isbn: '9782070360024', pictureUrl: '/c3.webp', source: GOODREADS },
      ],
    });
    renderPage('?isbn=9782070360024');
    // Google's and Goodreads' candidates share the identical title, so this is a genuine
    // multiple-match case (not the header/h1 duplication elsewhere in this file) — both must be
    // on screen.
    expect(await screen.findAllByText("L'Étranger")).toHaveLength(2);
    // Round 2, finding 1: the failure is a ruled NOTE, not a candidate — no frame, no title
    // role, no confirm control. Tolerant of the punctuation between source and message (an em
    // dash, not the middot the pre-fix copy used).
    expect(screen.getByText(/babelio.*no answer/i)).toBeInTheDocument();
    // Exactly the two real candidates get a cover — the failed one contributes no frame at all.
    expect(screen.getAllByRole('presentation')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /use this/i })).toHaveLength(2);
    // A real miss must not ALSO trip the manual-entry offer merely because one source failed.
    expect(screen.queryByText(/no match found/i)).not.toBeInTheDocument();
    // The defect this whole round fixes: no fabricated title anywhere on the screen.
    expect(screen.queryByText(/untitled/i)).not.toBeInTheDocument();
  });

  // Ruling A (overriding the brief): the no-result predicate is "every candidate carries an
  // error, or the array is empty" — never `length === 0` alone, which a genuine miss never
  // produces (Google always emits one errored candidate on zero results).
  // The exact regression this round fixes (finding 1): the old code rendered a full candidate
  // row — ruled frame, an invented `Untitled` title in the loudest role on screen, an echoed
  // ISBN — directly ABOVE this same `NO MATCH FOUND` block. One screen, two opposite claims.
  it('offers manual entry on a true miss — a non-empty array whose every candidate errored — with no phantom row', async () => {
    vi.mocked(detectionApi.book).mockResolvedValue({
      detectedBooks: [{ id: '', title: '', authors: null, isbn: '9781000000000', source: GOOGLE, error: 'No item found for code: 9781000000000' }],
    });
    renderPage('?isbn=9781000000000');
    expect(await screen.findByText(/no match found/i)).toBeInTheDocument();
    expect(screen.getByText(/google.*no answer/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /use this/i })).not.toBeInTheDocument();
    // The one assertion that would have caught the original defect: nothing on this screen ever
    // renders the fabricated word, in any element.
    expect(screen.queryByText(/untitled/i)).not.toBeInTheDocument();
    // No frame at all — a failure carries no artwork slot, real or empty.
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    // The code appears exactly once, at the head — `getByText` throws on a second match.
    expect(screen.getByText('9781000000000')).toBeInTheDocument();
  });

  it('offers manual entry on the rarer fully-empty response too, distinct from a true miss', async () => {
    vi.mocked(detectionApi.book).mockResolvedValue({});
    renderPage('?isbn=9780000000000');
    expect(await screen.findByText(/no match found/i)).toBeInTheDocument();
  });

  it('does not offer manual entry while even one usable candidate is present', async () => {
    vi.mocked(detectionApi.book).mockResolvedValue({
      detectedBooks: [{ id: 'g1', title: 'Ouvrage', authors: ['Anonyme'], isbn: '123', pictureUrl: '/c.webp', source: GOOGLE }],
    });
    renderPage('?isbn=1234567890123');
    await screen.findByText('Ouvrage');
    expect(screen.queryByText(/no match found/i)).not.toBeInTheDocument();
  });

  it('carries the ISBN through to manual entry so it is never typed twice', async () => {
    vi.mocked(detectionApi.book).mockResolvedValue({});
    renderPage('?isbn=9780000000000&collectionId=c1');
    await userEvent.click(await screen.findByRole('button', { name: /enter by hand/i }));
    expect(
      await screen.findByText(
        'landed:/libraries/lib-1/items/new/book?isbn=9780000000000&collectionId=c1 state:none',
      ),
    ).toBeInTheDocument();
  });

  describe('pictureUrl has three shapes, and only truthiness tells them apart', () => {
    it('renders the ruled empty frame when pictureUrl is absent entirely', async () => {
      vi.mocked(detectionApi.book).mockResolvedValue({
        detectedBooks: [{ id: 'gr1', title: 'Sans couverture', authors: ['A'], isbn: '1', source: GOODREADS }],
      });
      renderPage('?isbn=1');
      await screen.findByText('Sans couverture');
      expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    });

    // Google's own case (google.go:99): a present pointer to an empty string, not an absent
    // key. A naive `if (!pictureUrl)` check would already catch this via falsiness, but a
    // presence check (`'pictureUrl' in candidate`) would not — this is the shape that
    // distinguishes the two, and the one ruling B exists to name.
    it('renders the ruled empty frame when pictureUrl is present but the empty string', async () => {
      vi.mocked(detectionApi.book).mockResolvedValue({
        detectedBooks: [{ id: 'g1', title: 'La Peste', authors: ['Camus'], isbn: '1', pictureUrl: '', source: GOOGLE }],
      });
      renderPage('?isbn=1');
      await screen.findByText('La Peste');
      expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    });

    it('renders the cover image when pictureUrl is a real address', async () => {
      vi.mocked(detectionApi.book).mockResolvedValue({
        detectedBooks: [{ id: 'g1', title: 'Le Petit Prince', authors: ['A'], isbn: '1', pictureUrl: '/mock-thumbnails/cover-2.webp', source: GOOGLE }],
      });
      renderPage('?isbn=1');
      await screen.findByText('Le Petit Prince');
      expect(screen.getByRole('presentation')).toHaveAttribute('src', '/mock-thumbnails/cover-2.webp');
    });
  });

  it('prints FILING INTO with the collection name, never uppercased, surviving the whole session (no toast)', async () => {
    vi.mocked(detectionApi.book).mockResolvedValue({
      detectedBooks: [{ id: 'g1', title: 'Ouvrage', authors: ['A'], isbn: '1', pictureUrl: '/c.webp', source: GOOGLE }],
    });
    vi.mocked(collectionsApi.get).mockResolvedValue({ id: 'c1', name: 'Blake et Mortimer', itemCount: 4 });
    renderPage('?isbn=1&collectionId=c1');
    expect(await screen.findByText(/^filing into$/i)).toBeInTheDocument();
    // Split from the label deliberately (fix round 1, finding 1): `getByText` with a plain
    // string here would only ever see "Filing into " (the <p>'s own direct text node) — the
    // name sits in a sibling <span>, so a selector-scoped query is what actually finds it.
    // `.className` asserts the DECLARED rule (jsdom cannot see the rendered pixels; that half
    // is `check:browser`'s "collection name resolves to normal-case" check).
    const name = screen.getByText('Blake et Mortimer', {
      selector: '[data-mark="filing-into-name"]',
    });
    expect(name.className).toContain('normal-case');
  });

  it('prints no FILING INTO mark at all when the session is standalone', async () => {
    vi.mocked(detectionApi.book).mockResolvedValue({
      detectedBooks: [{ id: 'g1', title: 'Ouvrage', authors: ['A'], isbn: '1', pictureUrl: '/c.webp', source: GOOGLE }],
    });
    renderPage('?isbn=1');
    await screen.findByText('Ouvrage');
    expect(screen.queryByText(/filing into/i)).not.toBeInTheDocument();
    expect(collectionsApi.get).not.toHaveBeenCalled();
  });

  it('writes nothing until the reader confirms a candidate, then loops back to AddBook via replace', async () => {
    vi.mocked(detectionApi.book).mockResolvedValue({
      detectedBooks: [{ id: 'g1', title: 'Ouvrage', authors: ['A'], isbn: '1', pictureUrl: '/c.webp', source: GOOGLE }],
    });
    renderPage('?isbn=1&collectionId=c1');
    await screen.findByText('Ouvrage');
    expect(itemsApi.createBook).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /use this/i }));

    expect(itemsApi.createBook).toHaveBeenCalledWith('lib-1', expect.objectContaining({
      title: 'Ouvrage',
      authors: ['A'],
      pictureUrl: '/c.webp',
      collectionId: 'c1',
    }));
    // Cataloguing is a batch activity: the reader lands back on AddBook, still filing into the
    // same collection, rather than exiting the flow after one item.
    expect(
      await screen.findByText('landed:/libraries/lib-1/add/book?collectionId=c1 state:none'),
    ).toBeInTheDocument();
    // The defect this test guards: a `push` here leaves the just-spent results page reachable
    // by pressing back from the capture screen it loops to. Only `replace` retires it — the
    // DESTINATION alone (asserted above) cannot tell the two apart, since `location` looks
    // identical either way.
    const loopNavigation = navigateCalls.find(([path]) =>
      path.startsWith('/libraries/lib-1/add/book?'),
    );
    expect(loopNavigation?.[1]).toEqual(expect.objectContaining({ replace: true }));
  });

  it('confirms the save, so filing is never silent', async () => {
    vi.mocked(detectionApi.book).mockResolvedValue({
      detectedBooks: [{ id: 'g1', title: 'Ouvrage', authors: ['A'], isbn: '1', pictureUrl: '/c.webp', source: GOOGLE }],
    });
    renderPage('?isbn=1');
    await screen.findByText('Ouvrage');

    await userEvent.click(screen.getByRole('button', { name: /use this/i }));

    // The P0 this closes: the POST succeeded, the app replaced back to the capture screen, and
    // the DOM there was textually identical to a fresh arrival — "saved, next please" and
    // "something bounced me back" looked the same, so the reader re-scans and never reports it.
    // Scoped to the toast's own hook, not a bare text query: the item title also appears in the
    // candidate list, so an unscoped match would pass with no toast rendered at all.
    const toast = await screen.findByText(/ouvrage/i, { selector: '[data-toast]' });
    expect(toast).toBeInTheDocument();
  });

  it('reports a failed save in place rather than navigating away on it', async () => {
    vi.mocked(detectionApi.book).mockResolvedValue({
      detectedBooks: [{ id: 'g1', title: 'Ouvrage', authors: ['A'], isbn: '1', pictureUrl: '/c.webp', source: GOOGLE }],
    });
    vi.mocked(itemsApi.createBook).mockRejectedValueOnce(new Error('That request was not accepted.'));
    renderPage('?isbn=1');
    await userEvent.click(await screen.findByRole('button', { name: /use this/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/that request was not accepted/i);
    expect(screen.queryByText(/^landed:/)).not.toBeInTheDocument();
  });

  it('surfaces a transport failure with a retry control, distinct from a true miss', async () => {
    vi.mocked(detectionApi.book).mockRejectedValueOnce(new Error('Something went wrong on our side.'));
    renderPage('?isbn=9999999999999');
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.queryByText(/no match found/i)).not.toBeInTheDocument();

    vi.mocked(detectionApi.book).mockResolvedValueOnce({
      detectedBooks: [{ id: 'g1', title: 'Ouvrage', authors: ['A'], isbn: '1', pictureUrl: '/c.webp', source: GOOGLE }],
    });
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Ouvrage')).toBeInTheDocument();
  });

  // Fix round 1 (task 19): a bare `/add/book/results` with no `?isbn=` used to show this inline
  // ("No ISBN was carried through...") rather than redirect. Unified with VideoDetectionResults'
  // identical case — a results route reached with no identifying input at all is the same
  // situation on both flows, and `routes.jsx`'s `guard()` makes it a genuinely reachable dead end
  // (typed, edited, or bookmarked-mid-flow URL), not a theoretical one.
  it('redirects to AddBook with the shared no-input state when nothing was carried through', async () => {
    renderPage('');
    expect(
      await screen.findByText('landed:/libraries/lib-1/add/book state:{"noInput":true}'),
    ).toBeInTheDocument();
    expect(detectionApi.book).not.toHaveBeenCalled();
  });

  it('carries the collection into the same redirect', async () => {
    renderPage('?collectionId=c1');
    expect(
      await screen.findByText(
        'landed:/libraries/lib-1/add/book?collectionId=c1 state:{"noInput":true}',
      ),
    ).toBeInTheDocument();
  });
});
