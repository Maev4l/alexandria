import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Search from './Search.jsx';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';
import { ToastProvider } from '@/state/ToastContext.jsx';
import { handleMockRequest, resetMockState } from '../../tools/mock-api.js';
import { TERM_ERROR, TERM_MIXED, TERM_NONE } from '../../tools/mock-search.js';

// The fixture terms are IMPORTED, never retyped: `TERM_MIXED` is 'roman', not the 'blake' an
// earlier draft of this task's brief named. tools/mock-search.js is the authority on which
// input reaches which state, and a literal here would silently fall through to that route's
// "any other term" branch and quietly test a different state than the name claims.

// DEFECT this screen's own history turns on (critique P0 #1): reached from the loudest control
// in the design, it once had no way out. The exit assertions below predate the surface being
// real and are kept verbatim — routeExits.test.jsx walks the same route end to end.

const calls = [];

const stubFetch = () => {
  calls.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, options = {}) => {
      const method = options.method ?? 'GET';
      const body = options.body ? JSON.parse(options.body) : undefined;
      calls.push({ method, url: String(url), body });
      const result = handleMockRequest(method, String(url), body) ?? {
        status: 404,
        body: { message: 'Not found' },
      };
      return {
        ok: result.status < 400,
        status: result.status,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => result.body,
      };
    }),
  );
};

const searchCalls = () => calls.filter((c) => c.method === 'POST' && c.url.endsWith('/search'));

const renderSearch = (from = '/libraries') =>
  render(
    <MemoryRouter initialEntries={[from, '/search']} initialIndex={1}>
      <LibrariesProvider>
        <ToastProvider>
          <Routes>
            <Route path="/search" element={<Search />} />
            <Route path={from} element={<p>Back where the reader started</p>} />
          </Routes>
        </ToastProvider>
      </LibrariesProvider>
    </MemoryRouter>,
  );

const field = () => screen.getByRole('searchbox', { name: /search every library/i });

// Longer than the 300ms debounce, so "nothing fired" is a settled fact rather than a race.
const past = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

// The row is a <div> wrapping the item's Link; walking up from the title reaches it regardless
// of how the inner markup is arranged.
const rowFor = (title) => screen.getByText(title).closest('.row-skip');

beforeEach(() => {
  localStorage.clear();
  resetMockState();
  stubFetch();
});

afterEach(() => vi.unstubAllGlobals());

describe('Search — the screen keeps its name and its exit', () => {
  it('has a landmark and exactly one heading', () => {
    renderSearch();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument();
  });

  it('offers a real way back — the loudest control in the app must never dead-end', async () => {
    renderSearch();
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(await screen.findByText('Back where the reader started')).toBeInTheDocument();
  });

  it('does not carry the root wordmark — this is a destination, not the root', () => {
    renderSearch();
    expect(screen.queryByText('Alexandria')).toBeNull();
  });
});

describe('Search — the query', () => {
  it('fires nothing below three characters, and leaves the recents on screen', async () => {
    localStorage.setItem('alexandria.v3.recent-searches', JSON.stringify(['melville']));
    renderSearch();

    await userEvent.type(field(), 'ro');
    await past();

    expect(searchCalls()).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'melville' })).toBeInTheDocument();
  });

  it('fires exactly one request per settled value, not one per keystroke', async () => {
    renderSearch();

    await userEvent.type(field(), TERM_MIXED);
    await waitFor(() => expect(searchCalls()).toHaveLength(1));
    await past();

    expect(searchCalls()).toHaveLength(1);
    expect(searchCalls()[0].body).toEqual({ terms: [TERM_MIXED] });
  });

  it('sends the reader\'s own spelling — it never folds accents or case', async () => {
    // The server lowercases terms itself and does NOT fold accents; Bluge's fuzziness is what
    // rescues a missing accent. Folding here would query a different index than the one the
    // backend built, which is the same reason the stream's letters never use localeCompare.
    renderSearch();

    await userEvent.type(field(), 'Élan Noir');
    await waitFor(() => expect(searchCalls()).toHaveLength(1));

    expect(searchCalls()[0].body).toEqual({ terms: ['Élan', 'Noir'] });
  });

  it('offers no sort and no filter controls — the API has neither', async () => {
    renderSearch();

    await userEvent.type(field(), TERM_MIXED);
    await screen.findByText('1984');

    expect(screen.queryAllByRole('combobox')).toHaveLength(0);
    expect(screen.queryAllByRole('listbox')).toHaveLength(0);
  });
});

describe('Search — the result row', () => {
  it('names its library, because here the library IS new information', async () => {
    renderSearch();

    await userEvent.type(field(), TERM_MIXED);
    await screen.findByText('1984');

    expect(within(rowFor('1984')).getByText('Fiction')).toBeInTheDocument();
    expect(within(rowFor('Chinatown')).getByText('Films')).toBeInTheDocument();
    expect(within(rowFor('Le Grand Meaulnes')).getByText('Polars')).toBeInTheDocument();
  });

  it('marks a shared library with an INLINE tag and never a left edge', async () => {
    renderSearch();

    await userEvent.type(field(), TERM_MIXED);
    const shared = await screen.findByText('Le Grand Meaulnes');
    const row = shared.closest('.row-skip');

    // The tag names the owner, in --shared, inline.
    const tag = within(row).getByText('marie@example.com');
    expect(tag).toBeInTheDocument();
    expect(row.querySelector('.text-shared')).not.toBeNull();

    // The left edge stays free for the stamp's --out rule (DESIGN.md §6, one left edge per
    // element). A shared row that is not lent draws no edge at all.
    expect(row.querySelector('[data-edge]')).toBeNull();
  });

  it('stamps a lent result', async () => {
    renderSearch();

    await userEvent.type(field(), TERM_MIXED);
    await screen.findByText('Le Grand Sommeil');

    const row = rowFor('Le Grand Sommeil');
    expect(within(row).getByLabelText('On loan')).toBeInTheDocument();
    expect(row.querySelector('[data-edge="out"]')).not.toBeNull();
  });

  it('opens the actions sheet on an owned result and offers nothing on a shared one', async () => {
    renderSearch();

    await userEvent.type(field(), TERM_MIXED);
    await screen.findByText('1984');

    // Read-only declares itself by ABSENCE, not by a disabled control.
    expect(screen.queryByRole('button', { name: /actions for Le Grand Meaulnes/i })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /actions for 1984/i }));
    expect(await screen.findByRole('button', { name: /^lend$/i })).toBeInTheDocument();
  });
});

describe('Search — a mutation patches the row without re-running the query', () => {
  it('lends in place and never issues a second /search', async () => {
    renderSearch();

    await userEvent.type(field(), TERM_MIXED);
    await screen.findByText('1984');
    await waitFor(() => expect(searchCalls()).toHaveLength(1));

    // One item in this fixture is already out; the lend below must make it two.
    expect(screen.getAllByLabelText('On loan')).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: /actions for 1984/i }));
    await userEvent.click(await screen.findByRole('button', { name: /^lend$/i }));
    await userEvent.type(screen.getByLabelText(/who has it/i), 'Paul');
    await userEvent.click(screen.getByRole('button', { name: /record the loan/i }));

    await waitFor(() => expect(screen.getAllByLabelText('On loan')).toHaveLength(2));
    expect(within(rowFor('1984')).getByLabelText('On loan')).toBeInTheDocument();

    // The index propagates asynchronously, so re-running the query could legitimately return a
    // set that no longer holds the row just acted on — the reader would watch it vanish.
    await past();
    expect(searchCalls()).toHaveLength(1);
  });
});

describe('Search — the honest limits', () => {
  it('prints the match scope AND the accent note when nothing matched', async () => {
    renderSearch();

    await userEvent.type(field(), TERM_NONE);

    expect(
      await screen.findByText(/titles, authors, directors, cast and collections/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/accents/i)).toBeInTheDocument();
  });

  it('prints NEITHER when there are results — a positive assertion cannot detect surplus', async () => {
    renderSearch();

    await userEvent.type(field(), TERM_MIXED);
    await screen.findByText('1984');

    expect(screen.queryByText(/titles, authors, directors, cast and collections/i)).toBeNull();
    expect(screen.queryByText(/accents/i)).toBeNull();
  });

  it('prints neither before a query exists', async () => {
    renderSearch();
    await past();

    expect(screen.queryByText(/titles, authors, directors, cast and collections/i)).toBeNull();
    expect(screen.queryByText(/accents/i)).toBeNull();
  });
});

describe('Search — a failed search', () => {
  it('reports inline with a Try again control, and never as a toast', async () => {
    renderSearch();

    await userEvent.type(field(), TERM_ERROR);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/could not|went wrong/i);
    expect(within(alert.closest('div')).getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(document.querySelector('[data-toast]')).toBeNull();
  });

  it('Try again re-runs the same query', async () => {
    renderSearch();

    await userEvent.type(field(), TERM_ERROR);
    await screen.findByRole('alert');
    await waitFor(() => expect(searchCalls()).toHaveLength(1));

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(searchCalls()).toHaveLength(2));
    expect(searchCalls()[1].body).toEqual({ terms: [TERM_ERROR] });
  });
});

describe('Search — recents', () => {
  it('records a query that found something, and re-runs it on tap', async () => {
    renderSearch();

    await userEvent.type(field(), TERM_MIXED);
    await screen.findByText('1984');

    await userEvent.clear(field());
    await past();

    await userEvent.click(await screen.findByRole('button', { name: TERM_MIXED }));
    expect(field()).toHaveValue(TERM_MIXED);
  });

  it('Clear empties them with no confirmation step', async () => {
    localStorage.setItem('alexandria.v3.recent-searches', JSON.stringify(['melville', 'chandler']));
    renderSearch();

    expect(screen.getByRole('button', { name: 'melville' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(screen.queryByRole('button', { name: 'melville' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'chandler' })).toBeNull();
    expect(JSON.parse(localStorage.getItem('alexandria.v3.recent-searches') ?? '[]')).toEqual([]);
  });
});
