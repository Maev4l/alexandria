import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Search from './Search.jsx';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';
import { ToastProvider } from '@/state/ToastContext.jsx';
import { handleMockRequest, resetMockState } from '../../tools/mock-api.js';
import { TERM_ERROR, TERM_MIXED, TERM_NONE, TERM_SINGLE } from '../../tools/mock-search.js';

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

// Reports the live URL and how many entries the surface has pushed. `useSearchParams` writes
// through the router, so the only honest way to assert "?q= moved" is to read the router's own
// location rather than the component's state.
let locationSeen = '';
let historySeen = 0;
const LocationProbe = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  locationSeen = `${location.pathname}${location.search}`;
  if (navigationType === 'PUSH') historySeen += 1;
  return null;
};

const locationProbe = () => locationSeen;
const historyLength = () => historySeen;

const renderSearch = (from = '/libraries') =>
  render(
    <MemoryRouter initialEntries={[from, '/search']} initialIndex={1}>
      <LibrariesProvider>
        <ToastProvider>
          <LocationProbe />
          <Routes>
            <Route path="/search" element={<Search />} />
            <Route path={from} element={<p>Back where the reader started</p>} />
          </Routes>
        </ToastProvider>
      </LibrariesProvider>
    </MemoryRouter>,
  );

const field = () => screen.getByRole('searchbox', { name: /search every library/i });

// Nothing is debounced any more, so "nothing fired" needs only a turn of the event loop to be a
// settled fact rather than a race. Kept deliberately generous: a shorter wait would pass against
// a reinstated debounce for the first 300ms and prove nothing.
const past = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

// TYPING IS NOT SEARCHING. Every test that wants results must submit, exactly as a reader does —
// with the phone keyboard's action key, which `{Enter}` is. Written as a helper rather than
// appended to each `type` call so that a future change to how a search is triggered has one site.
const runSearch = async (text) => {
  await userEvent.type(field(), `${text}{Enter}`);
};

// The row is a <div> wrapping the item's Link; walking up from the title reaches it regardless
// of how the inner markup is arranged.
const rowFor = (title) => screen.getByText(title).closest('.row-skip');

beforeEach(() => {
  locationSeen = '';
  historySeen = 0;
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

  // SCOPED TO THE HEADER, and the scoping is the whole assertion. The sr-only <h1> above already
  // says "Search" and is independent of `<AppHeader>`'s `title` prop, so an unscoped query stays
  // green with the title dropped entirely — which is the exact state this screen shipped in and
  // this probe exists to prevent returning to. Inside the header the query can only be satisfied
  // by AppHeader's own title span.
  it('prints its own name in the header — back-and-nothing is the stub shape', () => {
    renderSearch();
    const header = within(document.querySelector('header'));
    expect(header.getByText('Search')).toBeInTheDocument();
  });

  // The title is deliberately INERT here. LibraryBrowse's is a button because its stream is
  // alphabetical and the top is a place to return to; a result set has no defined order to
  // return to the top of, and the sticky field already keeps the refining control in reach.
  it('does not make that name a control — there is no ordered top to scroll to', () => {
    renderSearch();
    const header = within(document.querySelector('header'));
    expect(header.queryByRole('button', { name: 'Search' })).toBeNull();
  });
});

describe('Search — the query', () => {
  it('fires NOTHING while the reader types — a request costs a round trip, and typing is not asking', async () => {
    renderSearch();

    // The whole term, at a reader's pace, with no submit. Under the debounce this alone fired a
    // request; the assertion is that it now fires none, which is the entire point of the change.
    await userEvent.type(field(), TERM_MIXED);
    await past();

    expect(searchCalls()).toHaveLength(0);
    // And the previous surface is untouched: nothing loading, nothing cleared.
    expect(screen.queryByText(/searching/i)).not.toBeInTheDocument();
  });

  it('fires nothing below three characters, and says why rather than going silent', async () => {
    localStorage.setItem('alexandria.v3.recent-searches', JSON.stringify(['melville']));
    renderSearch();

    await runSearch('ro');
    await past();

    expect(searchCalls()).toHaveLength(0);
    // Silence in reply to an explicit act is indistinguishable from a broken search. Under the
    // debounce there was no act, so there was nothing to answer.
    // BOTH readers, asserted separately: the printed line under the field, and the live region —
    // a reader who cannot see the line gets no `state` change either, so without the region they
    // would go on hearing whatever the previous query returned.
    expect(screen.getByText(/needs at least/i, { selector: 'p:not(.sr-only)' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/needs at least 3 characters/i);
    expect(screen.getByRole('button', { name: 'melville' })).toBeInTheDocument();
  });

  it('clears the too-short line on the next keystroke, not on a timer', async () => {
    renderSearch();

    await runSearch('ro');
    expect(screen.getAllByText(/needs at least/i).length).toBeGreaterThan(0);

    await userEvent.type(field(), 'm');
    expect(screen.queryAllByText(/needs at least/i)).toHaveLength(0);
    expect(searchCalls()).toHaveLength(0);
  });

  it('fires exactly one request per submit', async () => {
    renderSearch();

    await runSearch(TERM_MIXED);
    await waitFor(() => expect(searchCalls()).toHaveLength(1));
    await past();

    expect(searchCalls()).toHaveLength(1);
    expect(searchCalls()[0].body).toEqual({ terms: [TERM_MIXED] });
  });

  it('re-runs on a second submit of the SAME text — pressing again is a retry, never a no-op', async () => {
    renderSearch();

    await runSearch(TERM_MIXED);
    await waitFor(() => expect(searchCalls()).toHaveLength(1));

    // `?q=` is already this value, so `setParams` produces no state change. Without the attempt
    // counter the action key would be dead on the one screen where pressing it again is exactly
    // what a reader does when an answer looked wrong.
    await userEvent.type(field(), '{Enter}');
    await waitFor(() => expect(searchCalls()).toHaveLength(2));
  });

  it('runs from the magnifier as well as the action key — a pointer has no Enter', async () => {
    renderSearch();

    await userEvent.type(field(), TERM_MIXED);
    expect(searchCalls()).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: /^search$/i }));
    await waitFor(() => expect(searchCalls()).toHaveLength(1));
  });

  it('sends the reader\'s own spelling — it never folds accents or case', async () => {
    // The server lowercases terms itself and does NOT fold accents; Bluge's fuzziness is what
    // rescues a missing accent. Folding here would query a different index than the one the
    // backend built, which is the same reason the stream's letters never use localeCompare.
    renderSearch();

    await runSearch('Élan Noir');
    await waitFor(() => expect(searchCalls()).toHaveLength(1));

    expect(searchCalls()[0].body).toEqual({ terms: ['Élan', 'Noir'] });
  });

  it('offers no sort and no filter controls — the API has neither', async () => {
    renderSearch();

    await runSearch(TERM_MIXED);
    await screen.findByText('1984');

    expect(screen.queryAllByRole('combobox')).toHaveLength(0);
    expect(screen.queryAllByRole('listbox')).toHaveLength(0);
  });
});

describe('Search — the result row', () => {
  it('names its library, because here the library IS new information', async () => {
    renderSearch();

    await runSearch(TERM_MIXED);
    await screen.findByText('1984');

    expect(within(rowFor('1984')).getByText('Fiction')).toBeInTheDocument();
    expect(within(rowFor('Chinatown')).getByText('Films')).toBeInTheDocument();
    expect(within(rowFor('Le Grand Meaulnes')).getByText('Polars')).toBeInTheDocument();
  });

  it('marks a shared library with an INLINE tag and never a left edge', async () => {
    renderSearch();

    await runSearch(TERM_MIXED);
    const shared = await screen.findByText('Le Grand Meaulnes');
    const row = shared.closest('.row-skip');

    // The tag names the owner, in --shared, inline.
    const tag = within(row).getByText('marie@example.com');
    expect(tag).toBeInTheDocument();
    expect(row.querySelector('.text-shared')).not.toBeNull();

    // The left edge stays free for the stamp's --out rule (one left edge per
    // element). A shared row that is not lent draws no edge at all.
    expect(row.querySelector('[data-edge]')).toBeNull();
  });

  it('stamps a lent result', async () => {
    renderSearch();

    await runSearch(TERM_MIXED);
    await screen.findByText('Le Grand Sommeil');

    const row = rowFor('Le Grand Sommeil');
    expect(within(row).getByLabelText('On loan')).toBeInTheDocument();
    expect(row.querySelector('[data-edge="out"]')).not.toBeNull();
  });

  it('opens the actions sheet on an owned result and offers nothing on a shared one', async () => {
    renderSearch();

    await runSearch(TERM_MIXED);
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

    await runSearch(TERM_MIXED);
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

  // THE DIRECTION THAT DISCRIMINATES, and the reason a P0 shipped under a green suite. The test
  // above exercises a LEND, which ADDS `lentTo` — and a spread merge is perfect at adding. Only a
  // RETURN removes a key, and `lentTo` is `omitempty`, so it comes back ABSENT rather than null;
  // `{ ...row, ...fresh }` cannot delete it. The row went on printing OUT after a return that had
  // genuinely succeeded, the sheet went on offering `Mark returned`, and a second tap wrote a
  // third RETURNED event for one loan into an append-only ledger.
  //
  // So this asserts on ABSENCE. A probe written on the lend direction passes against the bug, and
  // that is precisely what happened.
  it('clears the stamp when a return removes lentTo — a key the response OMITS', async () => {
    renderSearch();

    await runSearch(TERM_MIXED);
    await screen.findByText('Le Grand Sommeil');
    await waitFor(() => expect(searchCalls()).toHaveLength(1));

    // The fixture's one lent item, which the row marks and the sheet offers to return.
    expect(screen.getAllByLabelText('On loan')).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: /actions for le grand sommeil/i }));
    await userEvent.click(await screen.findByRole('button', { name: /mark returned/i }));

    // The stamp must go, on the row AND everywhere else on the surface.
    await waitFor(() => expect(screen.queryAllByLabelText('On loan')).toHaveLength(0));
    expect(within(rowFor('Le Grand Sommeil')).queryByLabelText('On loan')).toBeNull();

    // And the sheet must stop offering an action that has already happened — the step whose
    // repetition corrupted the ledger.
    await userEvent.click(screen.getByRole('button', { name: /actions for le grand sommeil/i }));
    expect(await screen.findByRole('button', { name: /^lend$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark returned/i })).toBeNull();
  });
});

describe('Search — the query in the URL', () => {
  // Read at mount and never written, so the URL froze at whatever the reader arrived with:
  // refine, tap a result, press Back, and the field reads the OLD query with the OLD rows —
  // plus a refetch and a scroll to zero. It contradicts this surface's own contract sentence,
  // "returning the reader exactly where they were", and fails plausibly rather than visibly:
  // a normal results screen with a query in the field, just not theirs.
  it('writes the settled query to ?q= so Back restores what the reader last searched', async () => {
    renderSearch();

    await runSearch(TERM_MIXED);
    await screen.findByText('1984');
    await waitFor(() => expect(locationProbe()).toContain(`q=${TERM_MIXED}`));

    // Refining must move the URL with it — this is the exact step that used to leave `?q=` stale.
    await userEvent.clear(field());
    await runSearch(TERM_SINGLE);
    await screen.findByText('Nadja');
    await waitFor(() => expect(locationProbe()).toContain(`q=${TERM_SINGLE}`));
    expect(locationProbe()).not.toContain(TERM_MIXED);
  });

  it('replaces rather than pushes, so Back leaves the surface instead of retyping it', async () => {
    renderSearch();
    const before = historyLength();

    await runSearch(TERM_MIXED);
    await screen.findByText('1984');
    await waitFor(() => expect(locationProbe()).toContain(`q=${TERM_MIXED}`));

    // One entry per keystroke would make Back walk the reader backwards through their own typing
    // instead of leaving the screen — on the one surface whose exit is a `history.back()`.
    expect(historyLength()).toBe(before);
  });
});

describe('Search — the honest limits', () => {
  it('prints the match scope when nothing matched', async () => {
    renderSearch();

    await runSearch(TERM_NONE);

    expect(
      await screen.findByText(/titles, authors, directors, cast and collections/i),
    ).toBeInTheDocument();
  });

  // This assertion used to require an accent note, and in doing so it pinned copy that had
  // become false: the server now folds accents on both the indexed text and the query, so a
  // missing accent costs nothing. It is inverted rather than deleted, because the note is the
  // kind of thing that gets helpfully re-added — and a caveat that no longer holds is worse
  // than none, teaching a reader to distrust a spelling that works.
  it('prints NO accent caveat — the server folds accents, so there is nothing to warn about', async () => {
    renderSearch();

    await runSearch(TERM_NONE);
    await screen.findByText(/titles, authors, directors, cast and collections/i);

    expect(screen.queryByText(/accent/i)).toBeNull();
  });

  it('prints NEITHER when there are results — a positive assertion cannot detect surplus', async () => {
    renderSearch();

    await runSearch(TERM_MIXED);
    await screen.findByText('1984');

    expect(screen.queryByText(/titles, authors, directors, cast and collections/i)).toBeNull();
    expect(screen.queryByText(/accent/i)).toBeNull();
  });

  it('prints neither before a query exists', async () => {
    renderSearch();
    await past();

    expect(screen.queryByText(/titles, authors, directors, cast and collections/i)).toBeNull();
    expect(screen.queryByText(/accent/i)).toBeNull();
  });
});

describe('Search — a failed search', () => {
  it('reports inline with a Try again control, and never as a toast', async () => {
    renderSearch();

    await runSearch(TERM_ERROR);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/could not|went wrong/i);
    expect(within(alert.closest('div')).getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(document.querySelector('[data-toast]')).toBeNull();
  });

  it('Try again re-runs the same query', async () => {
    renderSearch();

    await runSearch(TERM_ERROR);
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

    await runSearch(TERM_MIXED);
    await screen.findByText('1984');

    await userEvent.clear(field());
    await past();

    await userEvent.click(await screen.findByRole('button', { name: TERM_MIXED }));
    expect(field()).toHaveValue(TERM_MIXED);
  });

  it('emptying the field clears the search, and the recents come back', async () => {
    renderSearch();

    await runSearch(TERM_MIXED);
    await screen.findByText('1984');

    // The recents and the invitation both require `status === 'idle'`, so results surviving an
    // empty field would cost the reader their shortcut list for the rest of the visit. The mark's
    // own name does not decide this — it is `Clear the text`, the narrower of the two readings.
    await userEvent.click(screen.getByRole('button', { name: /clear the text/i }));

    expect(screen.queryByText('1984')).toBeNull();
    expect(await screen.findByRole('button', { name: TERM_MIXED })).toBeInTheDocument();
    expect(locationSeen).not.toContain('q=');
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

describe('Search — the list survives a refinement', () => {
  // Gating the list on `status === 'done'` unmounted every row on each refinement: measured,
  // eight rows collapsed <main> to 135px, and four hundred took scrollHeight from 42,464 to 844
  // and scrollY from 4,180 to zero. A reader refining a query lost their place on every keystroke
  // past the third — and it falsified the premise of the mount measurement, which assumed one
  // commit per SEARCH rather than one per settled query.
  it('keeps the previous results mounted while the next query is in flight', async () => {
    renderSearch();

    await runSearch(TERM_MIXED);
    await screen.findByText('1984');

    // The mock answers synchronously, so the `loading` window closes inside a tick and racing it
    // would make this test pass or fail on scheduling. Hold the NEXT search open deliberately:
    // that window is the whole subject, and a probe that cannot observe it asserts nothing.
    let release;
    const settled = new Promise((resolve) => { release = resolve; });
    const immediate = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn(async (url, init) => {
      if (String(url).endsWith('/search')) await settled;
      return immediate(url, init);
    }));

    // SELECT-ALL AND RETYPE, never `clear()`: emptying the field is now an explicit reset that
    // drops `?q=` and returns the surface to its recents, so clearing here would unmount the rows
    // for a reason that has nothing to do with the window under test. A reader refining a query
    // edits it; they do not pass through empty.
    await userEvent.type(field(), `{selectall}${TERM_SINGLE}{Enter}`);

    // The old rows must still be on screen while the new search runs.
    // Two nodes say "Searching": the visible caps mark and the sr-only status region. Scoped to
    // the visible one, since this test is about what stays ON SCREEN.
    await waitFor(() =>
      expect(screen.getAllByText('Searching').some((el) => !el.hasAttribute('role'))).toBe(true),
    );
    expect(screen.getByText('1984')).toBeInTheDocument();

    release();

    // And cleared only when the new set lands.
    await screen.findByText('Nadja');
    expect(screen.queryByText('1984')).toBeNull();
  });
});

describe('Search — what a reader who cannot see it hears', () => {
  // At rest with eight results the surface announced nothing at all: the only live region was the
  // empty toast container, and "Searching" existed during load then left the DOM. So a non-sighted
  // reader heard "Searching" and then permanent silence, and could not tell eight results from
  // nothing matched — the block that exists specifically to prevent "I don't own it" was the one
  // thing never spoken.
  const status = () => document.querySelector('[role="status"]');

  it('is present in every state, because a region that unmounts takes its announcement with it', async () => {
    renderSearch();
    // Before a query exists. A live region announces CHANGES TO ITSELF, so it has to be mounted
    // before the change happens — a conditionally rendered one announces nothing on the render
    // that creates it.
    expect(status()).toBeInTheDocument();

    await runSearch(TERM_MIXED);
    await screen.findByText('1984');
    expect(status()).toBeInTheDocument();
  });

  it('states the outcome for a hit, a miss and a failure', async () => {
    renderSearch();

    await runSearch(TERM_MIXED);
    await screen.findByText('1984');
    await waitFor(() => expect(status()).toHaveTextContent(/\d+ results/));

    await userEvent.clear(field());
    await runSearch(TERM_NONE);
    // The head AND a pointer to the explanation. `role="status"` fires without moving the reading
    // cursor, so a reader who hears only "Nothing matched" is left with the wrong conclusion this
    // screen exists to prevent, delivered faster.
    await waitFor(() => expect(status()).toHaveTextContent(/nothing matched/i));
    expect(status()).toHaveTextContent(/what search covers/i);

    await userEvent.clear(field());
    await runSearch(TERM_ERROR);
    await waitFor(() => expect(status()).toHaveTextContent(/search failed/i));
  });

  it('says "1 result", not "1 results"', async () => {
    renderSearch();
    await runSearch(TERM_SINGLE);
    await screen.findByText('Nadja');
    await waitFor(() => expect(status()).toHaveTextContent('1 result'));
    expect(status()).not.toHaveTextContent('1 results');
  });
});

describe('Search — the surface before a query exists', () => {
  // The Empty state's rule: "a ruled frame with a caps invitation, at the same weight as a full block",
  // never nothing at all. A first visit has no recents and no query, so the whole surface below
  // the field was blank.
  it('invites rather than showing a blank page when there are no recents', async () => {
    renderSearch();
    expect(await screen.findByText(/search every library/i, { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText(/three characters or more/i)).toBeInTheDocument();
  });

  it('does not restate what search covers — that belongs to the zero-result block alone', async () => {
    renderSearch();
    await screen.findByText(/three characters or more/i);
    // Ruling 3, and the first draft of the invitation broke it: the limits explain a result the
    // reader did not expect, and nothing has been looked up yet.
    expect(screen.queryByText(/not summaries/i)).toBeNull();
    expect(screen.queryByText(/accents count/i)).toBeNull();
  });

  it('gives way to recents once there are any', async () => {
    renderSearch();
    await runSearch(TERM_MIXED);
    await screen.findByText('1984');
    await userEvent.clear(field());

    // The recents block is headed by a caps `Recent` label rather than a labelled list.
    await screen.findByText('Recent');
    expect(screen.queryByText(/three characters or more/i)).toBeNull();
  });
});

