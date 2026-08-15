import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
    // Every LedgerRow pairs a `lentAt → returnedAt` (or `→ still out`) range with an arrow —
    // the stable, already-established visual marker of one loan, rather than a test-only hook.
    await waitFor(() => expect(screen.getAllByText(/→/)).toHaveLength(4));
  });

  it('stamps an open loan as still out', async () => {
    renderPage();
    expect(await screen.findByText(/still out/i)).toBeInTheDocument();
  });

  it('shows "Never lent" rather than an empty list when the item has no events', async () => {
    renderPage('item-1984');
    expect(await screen.findByText(/never lent/i)).toBeInTheDocument();
    expect(screen.queryByText(/→/)).toBeNull();
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
          return jsonResponse(500, { message: 'Could not clear the record' });
        }
        const result = handleMockRequest('GET', path);
        return jsonResponse(result.status, result.body);
      }),
    );
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /clear the record/i }));
    await userEvent.click(await screen.findByRole('button', { name: /clear for good/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not clear the record/i);
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
    expect(screen.getAllByText(/→/)).toHaveLength(1);
    await userEvent.click(loadMore);
    // Once the second page lands, both pages' events are paired together into one full list —
    // pairing must see the whole history, since a loan can straddle a page boundary.
    await waitFor(() => expect(screen.getAllByText(/→/)).toHaveLength(2));
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
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
    await screen.findByText(/→/);
    expect(screen.queryByRole('button', { name: /clear the record/i })).toBeNull();
  });
});
