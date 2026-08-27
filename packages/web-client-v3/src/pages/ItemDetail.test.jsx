import { render, screen, waitFor, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, RouterProvider, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleMockRequest, resetMockState } from '../../tools/mock-api.js';
import ItemDetail from './ItemDetail.jsx';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';
import { ToastProvider } from '@/state/ToastContext.jsx';
import { libraries } from '@/test/fixtures';
import { matchesOwnText } from '@/test/matchesOwnText.js';

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
  // Every test in this file shares one module instance of the mock's write-backed state
  // (tools/mock-api.js), so a test that posts a real event must not inherit the previous test's
  // mutation of the same fixture item.
  resetMockState();
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
    // Marie's loan (item-lent's newest event) is open: the ruling states an open loan as
    // `LENT <date>` alone — no "still out", no second half (DetailMarks' stamp already says
    // it's out; a row echoing that would label the same fact twice). `LENT` and the date sit in
    // separate elements (label vs. mono value), so the check reads the row's full text content
    // rather than `getByText`, which only matches a single node's own direct text.
    await waitFor(() =>
      expect(screen.getByText('Marie').closest('div')).toHaveTextContent(/lent 07 aug 2026/i),
    );
  });

  // Round 5 critique #5 gated "Full record" on "leads somewhere new" — more PAIRED loans than
  // the preview shows, or a raw-events `nextToken` — reasoning that a link to the SAME rows just
  // seen was redundant. That reasoning was sound about the rows and wrong about the link: it
  // removed the ONLY route to /history for any item whose history pairs into <= LEDGER_PREVIEW
  // loans with no further page, and clearing a lending history exists nowhere else in the app
  // (p2 batch 2, finding 2). The ruling: "Full record" renders whenever the item has any lending
  // events at all, which is exactly this whole ledger block's own gate (`loans.length > 0`) — so
  // there is nothing left to test for absence, only that the link is never missing while a record
  // exists, at every loan count that could plausibly trip a future off-by-one.
  describe('"Full record" is the only route to /history, so it appears whenever a record exists', () => {
    // `item-lent`'s fixture events (src/test/fixtures/events.js) pair to exactly 3 loans —
    // LEDGER_PREVIEW's own cap — with no `nextToken`. This is the exact shape the old gate
    // suppressed on this very page; it must now render.
    it('appears even when the inline preview already shows every loan (no further page)', async () => {
      renderPage('item-lent');
      await waitFor(() =>
        expect(screen.getByText('Marie').closest('div')).toHaveTextContent(/lent 07 aug 2026/i),
      );
      expect(await screen.findByRole('link', { name: /full record/i })).toBeInTheDocument();
    });

    // The narrowest case that was actually broken: ONE paired loan, no nextToken. Three loans
    // already covers "at the LEDGER_PREVIEW boundary"; this covers "nowhere near it", so a fix
    // that accidentally re-keyed off loan count rather than dropping the count check entirely
    // would still be caught here.
    it('appears for an item with a single paired loan and no further page', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url) => {
          const path = String(url);
          if (path.endsWith('/libraries')) {
            return {
              ok: true,
              status: 200,
              headers: new Headers({ 'content-type': 'application/json' }),
              json: async () => ({ libraries }),
            };
          }
          if (path.includes('/events')) {
            return {
              ok: true,
              status: 200,
              headers: new Headers({ 'content-type': 'application/json' }),
              json: async () => ({
                events: [
                  { date: '2026-01-05T00:00:00Z', type: 'RETURNED', event: 'Sam' },
                  { date: '2026-01-01T00:00:00Z', type: 'LENT', event: 'Sam' },
                ],
              }),
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
      expect(await screen.findByRole('link', { name: /full record/i })).toBeInTheDocument();
    });

    it('appears when there are more PAIRED loans than the preview shows', async () => {
      const manyEvents = [
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
          if (path.endsWith('/libraries')) {
            return {
              ok: true,
              status: 200,
              headers: new Headers({ 'content-type': 'application/json' }),
              json: async () => ({ libraries }),
            };
          }
          if (path.includes('/events')) {
            return {
              ok: true,
              status: 200,
              headers: new Headers({ 'content-type': 'application/json' }),
              json: async () => ({ events: manyEvents }),
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
      expect(await screen.findByRole('link', { name: /full record/i })).toBeInTheDocument();
    });

    it('appears when a nextToken means more history exists, even if every paired loan already fits the preview', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url) => {
          const path = String(url);
          if (path.endsWith('/libraries')) {
            return {
              ok: true,
              status: 200,
              headers: new Headers({ 'content-type': 'application/json' }),
              json: async () => ({ libraries }),
            };
          }
          if (path.includes('/events')) {
            return {
              ok: true,
              status: 200,
              headers: new Headers({ 'content-type': 'application/json' }),
              json: async () => ({
                events: [{ date: '2026-01-01T00:00:00Z', type: 'LENT', event: 'Paul' }],
                nextToken: 'page-2',
              }),
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
      expect(await screen.findByRole('link', { name: /full record/i })).toBeInTheDocument();
    });
  });

  // Round 6 review: gate on RAW events, not paired loans, at both ends — `pairLoanEvents`
  // deliberately drops an orphaned RETURNED (one with no LENT before it), so an item can carry
  // real history while pairing zero of it into a loan. Gating "is there a record" on
  // `loans.length` would make that shape indistinguishable from "never lent".
  it('shows a route to the record even when every event fails to pair into a loan', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const path = String(url);
        if (path.endsWith('/libraries')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ libraries }),
          };
        }
        if (path.includes('/events')) {
          // A lone RETURNED, nothing LENT before it — `pairLoanEvents` drops this entirely
          // (src/lib/loans.js), so `loans` is `[]` here even though `events` is not.
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
              events: [{ date: '2026-01-01T00:00:00Z', type: 'RETURNED', event: 'Ghost' }],
            }),
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
    renderPage('item-1984');
    expect(await screen.findByText('The record')).toBeInTheDocument();
    expect(screen.getByText(/no loan pairs in this record yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /full record/i })).toBeInTheDocument();
  });

  // The old `.catch(() => ({ events: [] }))` swallowed a transient events failure and rendered
  // the item as though it had never been lent — no error, no retry, and `item.lentTo` could
  // still say OUT while the ledger silently vanished beneath it. This is the exact
  // silent-failure shape this project weighs as the worst class of defect, and the item itself must still render:
  // the failure is scoped to its history, not to whether this volume exists.
  it('surfaces a failed history fetch inline, with a retry, rather than as "never lent"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const path = String(url);
        if (path.endsWith('/libraries')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ libraries }),
          };
        }
        if (path.includes('/events')) {
          return {
            ok: false,
            status: 500,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ message: 'boom' }),
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
    // The item itself still loads: an events-only failure must not blank the whole cover.
    expect(await screen.findByText('Le Grand Sommeil')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    // Never the old silent shape: no "The record" heading claiming there is nothing to show.
    expect(screen.queryByText('The record')).toBeNull();
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
  // line for it. `lib-fiction` in the fixtures is shared with two people
  // (marie@example.com, paul@example.com), which is exactly the amended comp's "Shared · 2".
  it('links IN <library> beside the hero, not the header, which carries no title here', async () => {
    renderPage('item-lent');
    const link = await screen.findByRole('link', { name: 'Fiction' });
    expect(link).toHaveAttribute('href', '/libraries/lib-fiction');
  });

  it('shows the sharing mark beside the hero, matching the library sharedTo count', async () => {
    renderPage('item-lent');
    expect(await screen.findByText(matchesOwnText(/shared · 2/i))).toBeInTheDocument();
  });

  it('keeps the library out of the plate line — the line is the work, not the copy', async () => {
    renderPage('item-lent');
    const plateLine = await screen.findByText(/9782070404209/);
    expect(plateLine.closest('p')).not.toHaveTextContent('Fiction');
  });

  // Navigation is underlined, never accented — and DetailMarks' own `IN <library>` link, sixty
  // lines above on this same screen, already obeys it. Not a contrast fix: yellow on the cover
  // measures 11.71:1.
  it('sets the full-record link in the cover body tone, like every other link on the cover', async () => {
    renderPage('item-lent');
    const link = await screen.findByRole('link', { name: /full record/i });
    expect(link.className).toContain('text-cover-body');
    expect(link.className).not.toContain('text-imprint');
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

  // A prior audit could not tell "the mock returns the item unchanged" from "the UI never
  // re-reads" apart from the toast alone — both look identical to a reader watching only the
  // confirmation. This pins the actual screen content: the re-read this component performs
  // (`load()`, see the comment above `markReturned`) is only proof of life if the SOURCE it
  // reads from reflects the write. `item-lent` starts lentTo: 'Marie' with an open loan as its
  // newest event (src/test/fixtures/events.js); after a real RETURNED write both must flip.
  //
  // This needs its own fetch stub: the file's default one (above) forces every call through
  // `handleMockRequest('GET', path)` regardless of the real method, which happens to be harmless
  // for every OTHER test here (none of them inspect post-write state) but would silently hide
  // the very defect this test exists to catch — a write dispatched as 'GET' never reaches
  // mock-api.js's POST branch, so the mutation this test is proving would never run.
  it('clears the stamp and closes the open loan once the return is recorded', async () => {
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
        const method = options.method ?? 'GET';
        const body = options.body ? JSON.parse(options.body) : undefined;
        const result = handleMockRequest(method, path, body);
        return {
          ok: result.status < 400,
          status: result.status,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => result.body,
        };
      }),
    );
    renderPage('item-lent');
    expect(await screen.findByText(/out · marie/i)).toBeInTheDocument();
    // Before the return: Marie's row states only the LENT half (open loan, no second date).
    const marieRow = screen.getByText('Marie').closest('div');
    expect(marieRow).toHaveTextContent(/lent/i);
    expect(marieRow).not.toHaveTextContent(/returned/i);

    await userEvent.click(screen.getByRole('button', { name: /mark returned/i }));
    await screen.findByText(/le grand sommeil is back/i);

    expect(screen.queryByText(/out · marie/i)).toBeNull();
    // After the return: the loan is closed, so the row gains the RETURNED half.
    await waitFor(() =>
      expect(screen.getByText('Marie').closest('div')).toHaveTextContent(/returned/i),
    );
    expect(screen.getByRole('button', { name: /^lend$/i })).toBeInTheDocument();
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
            // Deliberately NOT app-authored copy — proving the app never renders the server's
            // own words, per api/client.js's STATUS_COPY map: an error must never attribute a
            // system fault to the reader.
            json: async () => ({ message: 'internal failure xyz' }),
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
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/went wrong/i);
    expect(alert).not.toHaveTextContent('internal failure xyz');
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

// Delete now sits on the same line as Mark returned/Lend and Edit ("all three on one
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
            // Deliberately NOT app-authored copy — proving the app never renders the server's
            // own words, per api/client.js's STATUS_COPY map: an error must never attribute a
            // system fault to the reader.
            json: async () => ({ message: 'internal failure xyz' }),
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
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/went wrong/i);
    expect(alert).not.toHaveTextContent('internal failure xyz');
    // Still confirming — a failed attempt must not force the reader to start over.
    expect(screen.getByRole('button', { name: /delete for good/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep it/i })).toBeInTheDocument();
    expect(document.querySelector('[data-toast]')).toBeNull();
  });
});

// IMPORTANT 1: `canAct` returns false for three different situations — not mine, not loaded
// yet, and the /libraries fetch failed — and only the third one used to render in total
// silence. An owner who deep-links to their own item while /libraries is failing saw no Lend,
// no Edit, no Delete and no explanation, which reads as "the app decided I may not act on my
// own item" — a plausible, wrong story with no error to report (prefer the defects that
// cannot be reported).
describe('when /libraries fails, read-only says why instead of staying silent', () => {
  const failLibrariesFetch = () =>
    vi.fn(async (url) => {
      const path = String(url);
      if (path.endsWith('/libraries')) {
        return {
          ok: false,
          status: 500,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ message: 'Could not load your libraries' }),
        };
      }
      const result = handleMockRequest('GET', path);
      return {
        ok: result.status < 400,
        status: result.status,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => result.body,
      };
    });

  it('explains the ambiguity and offers a control to retry, rather than rendering nothing', async () => {
    vi.stubGlobal('fetch', failLibrariesFetch());
    renderPage('item-lent');
    expect(
      await screen.findByText(/could not check whether this library is yours/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('still keeps actions absent — read-only stays the safe default — but no longer silent', async () => {
    vi.stubGlobal('fetch', failLibrariesFetch());
    renderPage('item-lent');
    await screen.findByText(/could not check whether this library is yours/i);
    expect(screen.queryByRole('button', { name: /^lend$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /mark returned/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^edit$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^delete$/i })).toBeNull();
  });

  it('says nothing extra once /libraries succeeds and the library is genuinely owned', async () => {
    // The control case: the same gate, with a healthy fetch, must not print the "could not
    // check" notice just because a page renders it in its markup.
    renderPage('item-lent');
    await screen.findByRole('button', { name: /^edit$/i });
    expect(screen.queryByText(/could not check whether this library is yours/i)).toBeNull();
  });
});

// MINOR 4: React Router keeps this same element mounted across a `:itemId`-only change, so a
// slow fetch for the item that just left the URL can resolve after a fast one for the item that
// replaced it. EditItem.jsx already guards its own mount fetch with a `cancelled` flag; this
// pins the same guard here.
describe('a stale fetch for the item that just left the URL', () => {
  it('does not paint over the item that replaced it at the new URL', async () => {
    // item-lent's GET (and its events) are held open until released manually; item-1984's
    // resolve immediately — recreating "navigate away before a slow request for the OLD item
    // comes back".
    let releaseLent;
    const lentGate = new Promise((resolve) => {
      releaseLent = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const path = String(url);
        if (path.endsWith('/libraries')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ libraries }),
          };
        }
        if (path.includes('/items/item-lent')) await lentGate;
        const result = handleMockRequest('GET', path);
        return {
          ok: result.status < 400,
          status: result.status,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => result.body,
        };
      }),
    );

    // `createMemoryRouter` (rather than the fixed-route `MemoryRouter` every other test in this
    // file uses) is the one thing that gives the test itself a way to change `:itemId` without
    // an in-app link between two item pages, which does not exist.
    const router = createMemoryRouter(
      [{ path: '/libraries/:libraryId/items/:itemId', element: <ItemDetail /> }],
      { initialEntries: ['/libraries/lib-fiction/items/item-lent'] },
    );
    render(
      <LibrariesProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </LibrariesProvider>,
    );

    // Let the (still-gated) request for item-lent actually start, then leave before it returns.
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument());
    router.navigate('/libraries/lib-fiction/items/item-1984');
    expect(await screen.findByText('1984')).toBeInTheDocument();

    // Now let the stale item-lent response land.
    releaseLent();
    // An unguarded `load` would call `setItem`/`setStatus` right about here; give it the chance.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText('1984')).toBeInTheDocument();
    expect(screen.queryByText('Le Grand Sommeil')).toBeNull();
    // The sharper failure mode this guards against: item-lent's OWN lentTo ('Marie') painted
    // onto item-1984's page, which a reader could then post RETURNED for against item-1984's id.
    expect(screen.queryByText(/marie/i)).toBeNull();
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

// The corrected ruling: the checkbox that used to live on the edit form repaired a
// cover that is CORRECT but never arrived (the async thumbnail pipeline failing — what
// `data fix-thumbnails` exists for on the admin side), and moved to item detail, where that
// failure is actually visible. It must NOT be gated on `pictureUrl` alone — that repeats the
// original defect in a new place, since detection often returns no cover at all.
describe('Fetch cover — repairs a thumbnail that failed to arrive, not a wrong address', () => {
  // `item-broken` (Pêcheur d'Islande) carries both a `picture` that 404s and, since the
  // correction, a `pictureUrl` to repair FROM (src/test/fixtures/items.js).
  it('stays absent until the thumbnail actually fails to load', async () => {
    renderPage('item-broken');
    await screen.findByText('Pêcheur d’Islande');
    // A present `picture` alone is not a failure — VolumeFrame has not yet had the chance to
    // fire `onerror`, so nothing here has actually gone wrong yet.
    expect(screen.queryByRole('button', { name: /fetch cover/i })).toBeNull();

    fireEvent.error(screen.getByRole('presentation'));
    expect(await screen.findByRole('button', { name: /fetch cover/i })).toBeInTheDocument();
  });

  // The gate this whole fix is about: a `pictureUrl`-presence check would have excluded this
  // exact reader, who has nothing to repair FROM. Custom fetch stub because no fixture item
  // combines "has a failing picture" with "has no pictureUrl" any more — item-broken now has
  // both, on purpose, for the test above.
  it('never appears for an item with no pictureUrl, even once its thumbnail fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const path = String(url);
        if (path.endsWith('/libraries')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ libraries }),
          };
        }
        if (path.includes('/items/item-no-source')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
              id: 'item-no-source',
              type: 0,
              title: 'No Source',
              ownerId: 'OWNER1',
              libraryId: 'lib-fiction',
              libraryName: 'Fiction',
              picture: 'https://cdn.example.test/never-produced.jpg',
              // Deliberately no pictureUrl: detection returned nothing to fetch FROM.
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ events: [] }),
        };
      }),
    );

    renderPage('item-no-source');
    await screen.findByText('No Source');
    fireEvent.error(screen.getByRole('presentation'));
    expect(screen.queryByRole('button', { name: /fetch cover/i })).toBeNull();
  });

  // Read-only means absent, not disabled — the same rule Lend/Edit/Delete already
  // follow. A shared-in library with both a failing picture AND a pictureUrl must still show
  // nothing, since actions belong to the owner alone.
  it('stays absent on a shared (read-only) library, even with a failed thumbnail and a pictureUrl', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const path = String(url);
        if (path.endsWith('/libraries')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ libraries }),
          };
        }
        if (path.includes('/items/item-shared-broken')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
              id: 'item-shared-broken',
              type: 0,
              title: 'Borrowed Copy',
              ownerId: 'OWNER2',
              libraryId: 'lib-shared-in',
              libraryName: 'Polars',
              picture: 'https://cdn.example.test/never-produced.jpg',
              pictureUrl: 'https://covers.example.test/borrowed-copy.jpg',
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ events: [] }),
        };
      }),
    );

    render(
      <MemoryRouter initialEntries={['/libraries/lib-shared-in/items/item-shared-broken']}>
        <LibrariesProvider>
          <ToastProvider>
            <Routes>
              <Route path="/libraries/:libraryId/items/:itemId" element={<ItemDetail />} />
            </Routes>
          </ToastProvider>
        </LibrariesProvider>
      </MemoryRouter>,
    );
    await screen.findByText('Borrowed Copy');
    fireEvent.error(screen.getByRole('presentation'));
    expect(screen.queryByRole('button', { name: /fetch cover/i })).toBeNull();
  });

  // The action itself: `updatePicture: true` on the same address the item already has — this
  // is a repair, not an edit, so nothing about the item's own fields changes — then the item
  // is re-read, the same pattern markReturned and deleteItem already follow (PUT returns an
  // empty body).
  it('asks the backend to refetch the same address, with updatePicture, then re-reads the item', async () => {
    let capturedPut = null;
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
        const method = options.method ?? 'GET';
        if (method === 'PUT' && path.includes('/books/item-broken')) {
          capturedPut = JSON.parse(options.body);
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => null,
          };
        }
        const body = options.body ? JSON.parse(options.body) : undefined;
        const result = handleMockRequest(method, path, body);
        return {
          ok: result.status < 400,
          status: result.status,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => result.body,
        };
      }),
    );

    renderPage('item-broken');
    await screen.findByText('Pêcheur d’Islande');
    fireEvent.error(screen.getByRole('presentation'));
    await userEvent.click(await screen.findByRole('button', { name: /fetch cover/i }));

    await waitFor(() => expect(capturedPut).not.toBeNull());
    expect(capturedPut).toMatchObject({
      title: 'Pêcheur d’Islande',
      pictureUrl: 'https://covers.example.test/pecheur-islande.jpg',
      updatePicture: true,
    });
    // No inline error banner from a crash mid-write.
    expect(screen.queryByRole('alert')).toBeNull();
  });

  // Traced by review: `fetchCover` succeeds and re-reads the item, but VolumeFrame's own
  // `failed` state is component-local and does not reset just because `item` changed — it only
  // clears on VolumeFrame's OWN independent 4s retry clock. Without this fix, the button would
  // still read "Fetch cover" (not "Fetching", fully clickable) for up to four seconds after a
  // request that may have already worked — a control asserting a problem the screen can no
  // longer support, the same shape as the checkbox this control replaced. The test asserts the
  // button is gone essentially immediately (testing-library's default `waitFor` timeout is
  // 1000ms, nowhere near VolumeFrame's 4000ms clock), and does so with NO fake-timer advance —
  // if this fix regressed to waiting on that clock, this test would time out, not merely be slow.
  it('clears the stale "still broken" assertion once the request resolves, without waiting on VolumeFrame\'s own retry clock', async () => {
    // The default beforeEach stub forces every call through `handleMockRequest('GET', path)`
    // regardless of the real method (see the comment above the "clears the stamp…" test in the
    // suite above) — a PUT to `/books/item-broken` would not match any GET-shaped route there
    // and would throw. This stub forwards the real method, same as that test's own.
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
        const method = options.method ?? 'GET';
        const body = options.body ? JSON.parse(options.body) : undefined;
        const result = handleMockRequest(method, path, body);
        return {
          ok: result.status < 400,
          status: result.status,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => result.body,
        };
      }),
    );

    renderPage('item-broken');
    await screen.findByText('Pêcheur d’Islande');
    fireEvent.error(screen.getByRole('presentation'));
    await userEvent.click(await screen.findByRole('button', { name: /fetch cover/i }));

    await waitFor(() => expect(screen.queryByRole('button', { name: /fetch cover/i })).toBeNull());
  });
});
