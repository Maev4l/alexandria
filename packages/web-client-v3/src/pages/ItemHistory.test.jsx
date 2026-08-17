import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, RouterProvider, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleMockRequest } from '../../tools/mock-api.js';
import ItemHistory from './ItemHistory.jsx';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';
import { ToastProvider } from '@/state/ToastContext.jsx';
import { libraries } from '@/test/fixtures';

const renderAt = (libraryId, itemId) =>
  render(
    <MemoryRouter initialEntries={[`/libraries/${libraryId}/items/${itemId}/history`]}>
      <LibrariesProvider>
        <ToastProvider>
          <Routes>
            <Route
              path="/libraries/:libraryId/items/:itemId/history"
              element={<ItemHistory />}
            />
            {/* A stand-in for item detail: proves navigation lands on the item's own route,
                without pulling in the whole of ItemDetail.jsx just to see where "back" landed. */}
            <Route path="/libraries/:libraryId/items/:itemId" element={<p>Back at the item</p>} />
          </Routes>
        </ToastProvider>
      </LibrariesProvider>
    </MemoryRouter>,
  );

// `item-lent` (Le Grand Sommeil, lib-fiction — owned, no sharedFrom) is the same fixture item
// ItemDetail.test.jsx uses for its lending scenarios.
const renderPage = (itemId = 'item-lent') => renderAt('lib-fiction', itemId);

const jsonResponse = (status, body) => ({
  ok: status < 400,
  status,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => body,
});

const fixtureFetch = () =>
  vi.fn(async (url) => {
    const path = String(url);
    if (path.endsWith('/libraries')) return jsonResponse(200, { libraries });
    const result = handleMockRequest('GET', path);
    return jsonResponse(result.status, result.body);
  });

beforeEach(() => {
  vi.stubGlobal('fetch', fixtureFetch());
});

afterEach(() => vi.unstubAllGlobals());

describe('ItemHistory', () => {
  it('lists every loan, not only the first three', async () => {
    // The fixture item-lent only pairs to 3 loans (ItemDetail's own preview cap) — a stubbed
    // set of 4 closed loans proves this page does not carry that same truncation over into
    // what is supposed to be the FULL record.
    const manyLoans = [
      { date: '2020-01-01T00:00:00Z', type: 'LENT', event: 'A' },
      { date: '2020-01-05T00:00:00Z', type: 'RETURNED', event: 'A' },
      { date: '2020-02-01T00:00:00Z', type: 'LENT', event: 'B' },
      { date: '2020-02-05T00:00:00Z', type: 'RETURNED', event: 'B' },
      { date: '2020-03-01T00:00:00Z', type: 'LENT', event: 'C' },
      { date: '2020-03-05T00:00:00Z', type: 'RETURNED', event: 'C' },
      { date: '2020-04-01T00:00:00Z', type: 'LENT', event: 'D' },
      { date: '2020-04-05T00:00:00Z', type: 'RETURNED', event: 'D' },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const path = String(url);
        if (path.endsWith('/libraries')) return jsonResponse(200, { libraries });
        if (path.includes('/events')) return jsonResponse(200, { events: manyLoans });
        const result = handleMockRequest('GET', path);
        return jsonResponse(result.status, result.body);
      }),
    );
    renderPage();
    // Every LedgerRow carries exactly one `Lent` label, open or closed — the stable,
    // already-established visual marker of one loan (the ruling dropped the `→` connector that
    // used to serve this role: DESIGN.md, LedgerRow.jsx), rather than a test-only hook.
    await waitFor(() => expect(screen.getAllByText(/^lent$/i)).toHaveLength(4));
  });

  it('stamps an open loan OUT, with no "still out" text on the date line', async () => {
    renderPage();
    // item-lent's most recent loan (Marie) is open — item history boxes its rows, so the bare
    // Overprint Stamp carries "is it out", and the date line states only `LENT <date>` (no
    // second half, per the ruling: an open loan has no second date to label).
    expect(await screen.findByLabelText(/^on loan$/i)).toBeInTheDocument();
    expect(screen.queryByText(/still out/i)).toBeNull();
  });

  it('shows "Never lent" rather than an empty list when the item has no events', async () => {
    renderPage('item-1984');
    expect(await screen.findByText(/never lent/i)).toBeInTheDocument();
    expect(screen.queryByText(/^lent$/i)).toBeNull();
  });

  // Round 6 review: `pairLoanEvents` drops an orphaned RETURNED (one with no LENT before it —
  // src/lib/loans.js), so an item can carry real events while pairing zero of them into a loan.
  // "Never lent" would be false here — something WAS recorded — and the old `loans.length > 0`
  // gate on Clear also made the button vanish for exactly this shape, leaving no way to remove
  // the very history that made "Never lent" wrong.
  it('distinguishes "no history" from "history that doesn\'t pair", and still offers Clear', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const path = String(url);
        if (path.endsWith('/libraries')) return jsonResponse(200, { libraries });
        if (path.includes('/events')) {
          return jsonResponse(200, {
            events: [{ date: '2026-01-01T00:00:00Z', type: 'RETURNED', event: 'Ghost' }],
          });
        }
        const result = handleMockRequest('GET', path);
        return jsonResponse(result.status, result.body);
      }),
    );
    renderPage();
    expect(await screen.findByText(/no loan on record/i)).toBeInTheDocument();
    // Not the genuinely-empty copy — that would be a false statement about this item.
    expect(screen.queryByText(/never lent/i)).toBeNull();
    expect(screen.queryByText(/^lent$/i)).toBeNull();
    // The whole point: there IS something to clear, so the control must still be offered.
    expect(screen.getByRole('button', { name: /clear the record/i })).toBeInTheDocument();
  });

  it('says the clear action removes the entire record, before it acts', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /clear the record/i }));
    expect(screen.getByText(/every lending event for this item/i)).toBeInTheDocument();
  });

  it('clears the record and returns to the item once confirmed', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /clear the record/i }));
    await userEvent.click(await screen.findByRole('button', { name: /clear for good/i }));
    // The sheet closes once the write succeeds, and the reader lands back on item detail.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('Back at the item')).toBeInTheDocument();
  });

  it('reports a failed clear inline, inside the sheet, and keeps the confirm controls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options = {}) => {
        const path = String(url);
        if (path.endsWith('/libraries')) return jsonResponse(200, { libraries });
        if (options.method === 'DELETE' && path.includes('/events')) {
          // Deliberately NOT app-authored copy — proving the app never renders the server's own
          // words, per ui-v3.md §7 and api/client.js's STATUS_COPY map.
          return jsonResponse(500, { message: 'internal failure xyz' });
        }
        const result = handleMockRequest('GET', path);
        return jsonResponse(result.status, result.body);
      }),
    );
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /clear the record/i }));
    await userEvent.click(await screen.findByRole('button', { name: /clear for good/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/went wrong/i);
    expect(alert).not.toHaveTextContent('internal failure xyz');
    // Still confirming — a failed attempt must not force the reader to start over.
    expect(screen.getByRole('button', { name: /clear for good/i })).toBeInTheDocument();
    expect(document.querySelector('[data-toast]')).toBeNull();
  });

  it('paginates behind a Load more button — the fixture route ignores nextToken entirely', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const path = String(url);
        if (path.endsWith('/libraries')) return jsonResponse(200, { libraries });
        if (path.includes('/events')) {
          return path.includes('nextToken')
            ? jsonResponse(200, {
                events: [{ date: '2019-01-01T00:00:00Z', type: 'LENT', event: 'Old' }],
              })
            : jsonResponse(200, {
                events: [{ date: '2026-01-01T00:00:00Z', type: 'LENT', event: 'New' }],
                nextToken: 'page-2',
              });
        }
        const result = handleMockRequest('GET', path);
        return jsonResponse(result.status, result.body);
      }),
    );
    renderPage();
    const loadMore = await screen.findByRole('button', { name: /load more/i });
    // One loan so far (the open "New" one) — the "Old" one is still on the next page.
    expect(screen.getAllByText(/^lent$/i)).toHaveLength(1);
    await userEvent.click(loadMore);
    // Once the second page lands, both pages' events are paired together into one full list —
    // pairing must see the whole history, since a loan can straddle a page boundary.
    await waitFor(() => expect(screen.getAllByText(/^lent$/i)).toHaveLength(2));
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
  });

  it('reports a failed "Load more" inline and lets the reader retry the same page', async () => {
    let eventsCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const path = String(url);
        if (path.endsWith('/libraries')) return jsonResponse(200, { libraries });
        if (path.includes('/events')) {
          eventsCalls += 1;
          // 1st call: initial page, with more to come. 2nd call (the first "Load more" click):
          // fails. 3rd call (retry, same nextToken): succeeds.
          if (eventsCalls === 1) {
            return jsonResponse(200, {
              events: [{ date: '2026-01-01T00:00:00Z', type: 'LENT', event: 'New' }],
              nextToken: 'page-2',
            });
          }
          if (eventsCalls === 2) {
            // Deliberately NOT app-authored copy — proving the app never renders the server's
            // own words, per ui-v3.md §7 and api/client.js's STATUS_COPY map.
            return jsonResponse(500, { message: 'internal failure xyz' });
          }
          return jsonResponse(200, {
            events: [{ date: '2019-01-01T00:00:00Z', type: 'LENT', event: 'Old' }],
          });
        }
        const result = handleMockRequest('GET', path);
        return jsonResponse(result.status, result.body);
      }),
    );
    renderPage();
    const loadMore = await screen.findByRole('button', { name: /load more/i });
    await userEvent.click(loadMore);
    // A reader on poor signal must be able to see the click registered and failed — not a
    // button that silently reverts to its own starting label.
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/went wrong/i);
    expect(alert).not.toHaveTextContent('internal failure xyz');
    // Recovery is a control: the same page can be retried, not just re-read about.
    const retry = screen.getByRole('button', { name: /try again/i });
    await userEvent.click(retry);
    await waitFor(() => expect(screen.getAllByText(/^lent$/i)).toHaveLength(2));
    // The error clears once the retry succeeds.
    expect(screen.queryByRole('alert')).toBeNull();
  });

  // IMPORTANT 1: the same ambiguity ItemDetail's action row has — `canAct` cannot tell "not
  // mine" from "not loaded yet" from "the /libraries fetch failed" — silently hid Clear too.
  describe('when /libraries fails, read-only says why instead of staying silent', () => {
    const failLibrariesFetch = () =>
      vi.fn(async (url) => {
        const path = String(url);
        if (path.endsWith('/libraries')) {
          return jsonResponse(500, { message: 'Could not load your libraries' });
        }
        const result = handleMockRequest('GET', path);
        return jsonResponse(result.status, result.body);
      });

    it('explains the ambiguity and offers a control to retry, rather than rendering nothing', async () => {
      vi.stubGlobal('fetch', failLibrariesFetch());
      renderPage();
      expect(
        await screen.findByText(/could not check whether this library is yours/i),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('still keeps Clear absent — read-only stays the safe default — but no longer silent', async () => {
      vi.stubGlobal('fetch', failLibrariesFetch());
      renderPage();
      await screen.findByText(/could not check whether this library is yours/i);
      expect(screen.queryByRole('button', { name: /clear the record/i })).toBeNull();
    });

    it('says nothing extra once /libraries succeeds and the library is genuinely owned', async () => {
      renderPage();
      await screen.findByRole('button', { name: /clear the record/i });
      expect(screen.queryByText(/could not check whether this library is yours/i)).toBeNull();
    });
  });

  // MINOR 4: same guard as ItemDetail — React Router keeps this element mounted across a
  // `:itemId`-only change, so a slow fetch for the item that just left the URL could otherwise
  // resolve after a fast one for the item that replaced it.
  describe('a stale fetch for the item that just left the URL', () => {
    it('does not paint over the item that replaced it at the new URL', async () => {
      let releaseLent;
      const lentGate = new Promise((resolve) => {
        releaseLent = resolve;
      });
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url) => {
          const path = String(url);
          if (path.endsWith('/libraries')) return jsonResponse(200, { libraries });
          if (path.includes('/items/item-lent')) await lentGate;
          const result = handleMockRequest('GET', path);
          return jsonResponse(result.status, result.body);
        }),
      );

      const router = createMemoryRouter(
        [{ path: '/libraries/:libraryId/items/:itemId/history', element: <ItemHistory /> }],
        { initialEntries: ['/libraries/lib-fiction/items/item-lent/history'] },
      );
      render(
        <LibrariesProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </LibrariesProvider>,
      );

      await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument());
      router.navigate('/libraries/lib-fiction/items/item-1984/history');
      // item-1984 has no lending events at all — "Never lent" is the tell that ITS fetch, not
      // item-lent's, is the one that landed.
      expect(await screen.findByText(/never lent/i)).toBeInTheDocument();

      releaseLent();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(screen.getByText(/never lent/i)).toBeInTheDocument();
      expect(screen.queryByText(/^lent$/i)).toBeNull();
    });
  });

  it('never offers Clear on a shared (read-only) library, even with lending history', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const path = String(url);
        if (path.endsWith('/libraries')) return jsonResponse(200, { libraries });
        if (path.includes('/events')) {
          return jsonResponse(200, {
            events: [
              { date: '2026-01-01T00:00:00Z', type: 'LENT', event: 'Paul' },
              { date: '2026-01-05T00:00:00Z', type: 'RETURNED', event: 'Paul' },
            ],
          });
        }
        const result = handleMockRequest('GET', path);
        return jsonResponse(result.status, result.body);
      }),
    );
    // lib-shared-in carries `sharedFrom`, so item-shared is read-only — same gate as ItemDetail.
    renderAt('lib-shared-in', 'item-shared');
    await screen.findByText(/^lent$/i);
    expect(screen.queryByRole('button', { name: /clear the record/i })).toBeNull();
  });
});
