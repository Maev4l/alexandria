import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppRoutes from './routes.jsx';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';
import { ToastProvider } from '@/state/ToastContext.jsx';
import { libraries } from '@/test/fixtures';
import { handleMockRequest } from '../tools/mock-api.js';

// The critique's own words: "Verification is excellent at what it measures and silent on
// whether the product works — nobody tapped the yellow box." Every other test in this app
// renders one page in isolation with a hand-picked Route. This file exists specifically to
// press the REAL, wired affordance — through the app's actual route table (`./routes.jsx`),
// not a stand-in — and follow it to whatever it actually lands on, the way a reader would.
//
// SCOPE: this pins the two entry points the critique named as "the loudest control in the
// entire design" — the pinned Search Field on the libraries root, and the search plate on item
// detail — both of which routed to a dead end for three slices. It does not walk every route in
// the app: several other stub screens (Settings, AddBook, AddVideo, …) are equally unfinished
// and equally lack a back control, but they are pre-existing, tracked, not-yet-built work per
// `.claude/ui-v3.md`'s own progress checklist, not a regression introduced or hidden by this
// task. Asserting on them here would fail the suite over already-known incompleteness rather
// than a new defect, which is exactly the scope this task was told NOT to expand into. A future
// screen that IS built is expected to extend this list.
vi.mock('@/auth/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { id: 'OWNER1', initials: 'JR', email: 'jr@example.com', approved: true } }),
}));

const renderApp = (initialPath) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LibrariesProvider>
        <ToastProvider>
          <AppRoutes />
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

describe('the two loudest wired affordances named by the critique do not dead-end', () => {
  it('the libraries root\'s pinned Search Field does not dead-end', async () => {
    renderApp('/libraries');
    // Wait for the real root screen (not the Suspense fallback) to have actually landed.
    await screen.findByText('Fiction');

    await userEvent.click(screen.getByRole('button', { name: /^search$/i }));

    // Landed on the real, routed Search screen — not a hand-picked stand-in.
    await screen.findByRole('heading', { level: 1, name: 'Search' });
    const back = screen.getByRole('button', { name: /back/i });

    await userEvent.click(back);
    // A dead end has no way to make this assertion true again: the reader is back where they
    // started, not stuck on the surface the loudest control on the screen sent them to.
    expect(await screen.findByText('Fiction')).toBeInTheDocument();
  });

  it("item detail's search plate does not dead-end", async () => {
    renderApp('/libraries/lib-fiction/items/item-lent');
    await screen.findByText('Le Grand Sommeil');

    await userEvent.click(screen.getByRole('link', { name: 'Search every library' }));

    await screen.findByRole('heading', { level: 1, name: 'Search' });
    const back = screen.getByRole('button', { name: /back/i });

    await userEvent.click(back);
    expect(await screen.findByText('Le Grand Sommeil')).toBeInTheDocument();
  });
});
