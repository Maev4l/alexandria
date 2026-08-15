import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleMockRequest } from '../../tools/mock-api.js';
import ItemDetail from './ItemDetail.jsx';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';
import { ToastProvider } from '@/state/ToastContext.jsx';
import { libraries } from '@/test/fixtures';

const renderPage = (itemId) =>
  render(
    <MemoryRouter initialEntries={[`/libraries/lib-fiction/items/${itemId}`]}>
      <LibrariesProvider>
        {/* The real app always has a ToastProvider above every route (App.jsx) — confirmations
            for Mark returned / Lend / Delete are real toasts, not a mocked stub. */}
        <ToastProvider>
          <Routes>
            <Route path="/libraries/:libraryId/items/:itemId" element={<ItemDetail />} />
          </Routes>
        </ToastProvider>
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

// DEFECT 2: `Mark returned` used to open ItemActionsSheet — a menu of Edit/Lend/Delete — when
// the label promised one specific action. A label is a promise: these tests hold the rebuilt
// action set to it. `item-lent` (Le Grand Sommeil, lentTo: 'Marie') and `item-1984` (not lent)
// are both fixtures in lib-fiction, which `canAct` treats as owned (no `sharedFrom`).
describe('the primary action acts or asks for exactly what it needs — never a menu', () => {
  it('"Mark returned" acts directly: no dialog ever opens', async () => {
    renderPage('item-lent');
    const button = await screen.findByRole('button', { name: /mark returned/i });
    await userEvent.click(button);
    // Not even transiently: this assertion would catch a regression back to
    // `setIsActing(true)` just as easily as one that never called an API at all.
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('posts the RETURNED event and confirms as a toast once the item is re-read', async () => {
    renderPage('item-lent');
    await userEvent.click(await screen.findByRole('button', { name: /mark returned/i }));
    expect(await screen.findByText(/le grand sommeil is back/i)).toBeInTheDocument();
  });

  it('"Lend" opens a sheet holding ONLY the lend form — no Edit, no Delete, no menu', async () => {
    renderPage('item-1984');
    const button = await screen.findByRole('button', { name: /^lend$/i });
    await userEvent.click(button);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/who has it/i)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /^edit$/i })).toBeNull();
    expect(within(dialog).queryByRole('button', { name: /^delete/i })).toBeNull();
  });

  it('records the loan from the sheet and confirms once the item is re-read', async () => {
    renderPage('item-1984');
    await userEvent.click(await screen.findByRole('button', { name: /^lend$/i }));
    await userEvent.type(screen.getByLabelText(/who has it/i), 'Marie');
    await userEvent.click(screen.getByRole('button', { name: /record the loan/i }));
    expect(await screen.findByText(/is out with marie/i)).toBeInTheDocument();
    // The sheet closes once the write and the re-read both succeed.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('reports a failed return inline, never only as a toast', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options = {}) => {
        const path = String(url);
        if (path.endsWith('/libraries')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ libraries }),
          };
        }
        if (path.endsWith('/events') && options.method === 'POST') {
          return {
            ok: false,
            status: 500,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ message: 'Could not record the return' }),
          };
        }
        const result = handleMockRequest('GET', path);
        return {
          ok: result.status < 400,
          status: result.status,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => result.body,
        };
      }),
    );
    renderPage('item-lent');
    await userEvent.click(await screen.findByRole('button', { name: /mark returned/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not record the return/i);
    expect(document.querySelector('[data-toast]')).toBeNull();
  });

  it('keeps Edit as the one secondary control beside the primary, nowhere else on the page', async () => {
    renderPage('item-1984');
    await userEvent.click(await screen.findByRole('button', { name: /^lend$/i }));
    await screen.findByRole('dialog');
    // Even with the lend sheet open, there is still exactly one Edit control on the page.
    expect(screen.getAllByRole('button', { name: /^edit$/i })).toHaveLength(1);
  });
});

// Delete now sits on the same line as Mark returned/Lend and Edit (DESIGN.md, "all three on one
// line" — a lone Delete below the ledger used to read as though it deleted the RECORD, not the
// item). Hierarchy is carried by treatment, not distance. It still confirms IN PLACE before
// acting, the same in-page reveal UnshareLibrary.jsx already uses, rather than a sheet.
describe('Delete shares the action row and confirms in place', () => {
  // jsdom does no layout, so it cannot see whether the row WRAPS at 320px (that lives in
  // scripts/check-browser.mjs, in a real browser). What jsdom CAN pin is the structural fact
  // this task actually changed: the three buttons are siblings in one container rather than
  // Delete living in a second block below, which is what a regression back to the old two-block
  // layout would break first.
  it('renders Mark returned/Lend, Edit and Delete as siblings in one row', async () => {
    renderPage('item-lent');
    const markReturned = await screen.findByRole('button', { name: /^mark returned$/i });
    const edit = screen.getByRole('button', { name: /^edit$/i });
    const del = screen.getByRole('button', { name: /^delete$/i });
    expect(markReturned.parentElement).toBe(edit.parentElement);
    expect(edit.parentElement).toBe(del.parentElement);
  });

  it('is not offered until the reader confirms, and names what is lost', async () => {
    renderPage('item-lent');
    const deleteButton = await screen.findByRole('button', { name: /^delete$/i });
    await userEvent.click(deleteButton);
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete for good/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep it/i })).toBeInTheDocument();
  });

  it('"Keep it" backs out without deleting anything', async () => {
    renderPage('item-lent');
    await userEvent.click(await screen.findByRole('button', { name: /^delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /keep it/i }));
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    expect(screen.queryByText(/cannot be undone/i)).toBeNull();
  });

  it('deletes for good and confirms — the item is gone, so there is nothing left to re-read', async () => {
    renderPage('item-lent');
    await userEvent.click(await screen.findByRole('button', { name: /^delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /delete for good/i }));
    expect(await screen.findByText(/le grand sommeil deleted/i)).toBeInTheDocument();
  });

  // Deferred finding: the implementation deliberately keeps the confirm state open when a
  // delete fails, rather than making the reader confirm again from scratch after a network
  // blip. Nothing pinned that choice before this test.
  it('keeps the confirm controls in place and reports a failed delete inline, not as a toast', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options = {}) => {
        const path = String(url);
        if (path.endsWith('/libraries')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ libraries }),
          };
        }
        if (options.method === 'DELETE' && path.includes('/items/')) {
          return {
            ok: false,
            status: 500,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ message: 'Could not delete this item' }),
          };
        }
        const result = handleMockRequest('GET', path);
        return {
          ok: result.status < 400,
          status: result.status,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => result.body,
        };
      }),
    );
    renderPage('item-lent');
    await userEvent.click(await screen.findByRole('button', { name: /^delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /delete for good/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not delete this item/i);
    // Still confirming — a failed attempt must not force the reader to start over.
    expect(screen.getByRole('button', { name: /delete for good/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep it/i })).toBeInTheDocument();
    expect(document.querySelector('[data-toast]')).toBeNull();
  });
});

// Deferred finding: everything behind this gate (Mark returned, Lend, Edit, Delete) was rebuilt
// in the same pass that removed the old three-action-menu "Mark returned" dialog, and nothing
// pinned "read-only means absent, not disabled" against the rebuilt set.
describe('a shared (read-only) library offers no action controls', () => {
  it('renders zero buttons in <main> for an item in a library shared with me', async () => {
    render(
      <MemoryRouter initialEntries={['/libraries/lib-shared-in/items/item-shared']}>
        <LibrariesProvider>
          <ToastProvider>
            <Routes>
              <Route path="/libraries/:libraryId/items/:itemId" element={<ItemDetail />} />
            </Routes>
          </ToastProvider>
        </LibrariesProvider>
      </MemoryRouter>,
    );
    await screen.findByText('Le Grand Meaulnes');
    expect(within(screen.getByRole('main')).queryAllByRole('button')).toHaveLength(0);
  });
});
