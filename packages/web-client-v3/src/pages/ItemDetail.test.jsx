import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleMockRequest } from '../../tools/mock-api.js';
import ItemDetail from './ItemDetail.jsx';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';
import { libraries } from '@/test/fixtures';

const renderPage = (itemId) =>
  render(
    <MemoryRouter initialEntries={[`/libraries/lib-fiction/items/${itemId}`]}>
      <LibrariesProvider>
        <Routes>
          <Route path="/libraries/:libraryId/items/:itemId" element={<ItemDetail />} />
        </Routes>
      </LibrariesProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      const path = String(url);
      const result = path.endsWith('/libraries')
        ? { status: 200, body: { libraries } }
        : handleMockRequest('GET', path);
      return {
        ok: result.status < 400,
        status: result.status,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => result.body,
      };
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

// The fixture item is `Le Grand Sommeil` (Raymond Chandler, ISBN 9782070404209, lentTo: 'Marie')
// — comp 3 in docs/ui-design/ui-v3-mockup.html agrees. Not `Notre-Dame de Paris`, which is not a
// fixture item at all.
describe('ItemDetail', () => {
  it('resolves from the route alone, in one request, so the link survives a refresh', async () => {
    renderPage('item-lent');
    expect(await screen.findByText('Le Grand Sommeil')).toBeInTheDocument();
  });

  it('names the borrower and the duration here, which a row never does', async () => {
    renderPage('item-lent');
    expect(await screen.findByText(/out · marie/i)).toBeInTheDocument();
  });

  it('carries the record inline, not only behind the history screen', async () => {
    renderPage('item-lent');
    await waitFor(() => expect(screen.getByText(/still out/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /full record/i })).toBeInTheDocument();
  });

  it('says plainly when the item is not there, instead of spinning forever', async () => {
    renderPage('does-not-exist');
    expect(await screen.findByRole('alert')).toHaveTextContent(/not in this collection/i);
  });

  it('does not uppercase the title', async () => {
    renderPage('item-lent');
    const title = await screen.findByText('Le Grand Sommeil');
    expect(title.className).not.toContain('uppercase');
  });

  // Round 2: the hero gained a marks column beside the frame, and the library left the plate
  // line for it (DESIGN.md §5). `lib-fiction` in the fixtures is shared with two people
  // (marie@example.com, paul@example.com), which is exactly the amended comp's "Shared · 2".
  it('links IN <library> beside the hero, not the header, which carries no title here', async () => {
    renderPage('item-lent');
    const link = await screen.findByRole('link', { name: 'Fiction' });
    expect(link).toHaveAttribute('href', '/libraries/lib-fiction');
  });

  it('shows the sharing mark beside the hero, matching the library sharedTo count', async () => {
    renderPage('item-lent');
    expect(await screen.findByText(/shared · 2/i)).toBeInTheDocument();
  });

  it('keeps the library out of the plate line — the line is the work, not the copy', async () => {
    renderPage('item-lent');
    const plateLine = await screen.findByText(/9782070404209/);
    expect(plateLine.closest('p')).not.toHaveTextContent('Fiction');
  });
});
