import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { libraries } from '@/test/fixtures';
import Libraries from './Libraries.jsx';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';

vi.mock('@/auth/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { initials: 'JR', email: 'jr@example.com' } }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <LibrariesProvider>
        <Libraries />
      </LibrariesProvider>
    </MemoryRouter>,
  );

const respondWith = (body, ok = true, status = 200) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok,
      status,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => body,
    })),
  );

beforeEach(() => respondWith({ libraries }));
afterEach(() => vi.unstubAllGlobals());

describe('Libraries', () => {
  it('splits the list into mine and shared with me, mine first', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Fiction')).toBeInTheDocument());
    // The product's primary IA division, promoted from role="separator" to a real <h2> so it is
    // reachable navigating by heading — see the comment beside StreamHead in Libraries.jsx.
    const heads = screen.getAllByRole('heading', { level: 2 });
    expect(heads[0]).toHaveTextContent(/mine/i);
    expect(heads[1]).toHaveTextContent(/shared with me/i);
  });

  it('counts each section', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Fiction')).toBeInTheDocument());
    const heads = screen.getAllByRole('heading', { level: 2 });
    expect(heads[0]).toHaveTextContent('3');
    expect(heads[1]).toHaveTextContent('1');
  });

  it('offers the primary action to create a library', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: /new library/i })).toBeInTheDocument();
  });

  it('offers actions on owned rows and none on a shared-with-me row', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Fiction')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /actions for fiction/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /actions for polars/i })).toBeNull();
  });

  it('reports a failure inline rather than only as a toast, and never the server\'s own words', async () => {
    // Deliberately NOT app-authored copy — proving the app never renders the server's own
    // words, per ui-v3.md §7 and api/client.js's STATUS_COPY map. This is the exact defect a
    // design critique found by intercepting this same request: a 500 carrying
    // {"message":"Unauthorized"} printed "Unauthorized" on screen.
    respondWith({ message: 'internal failure xyz' }, false, 500);
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/went wrong/i);
    expect(alert).not.toHaveTextContent('internal failure xyz');
  });

  // An empty state is a RULED FRAME with a caps invitation, at the same weight as a full
  // block. This one was a 12px `--ink-soft` line under a rule — quieter than the 22px/700 rows
  // it replaces, which is the opposite of the rule — on the app's home screen, so it is the
  // reader's first impression of the product.
  it('gives the empty home screen a ruled frame and its own control', async () => {
    respondWith({ libraries: [] });
    renderPage();

    const invitation = await screen.findByText(/no libraries yet/i);
    const frame = invitation.closest('div');
    expect(frame.className).toContain('border-2');
    expect(frame.className).toContain('border-ink');
    // Recovery is a control, never an instruction to perform a gesture elsewhere.
    // SCOPED to the frame with `within`, because the bottom bar's primary carries the same name.
    // That duplication is intended and has a precedent stated in LibraryBrowse: the empty state's
    // control duplicates the existing one rather than replacing it, reached a different way.
    expect(within(frame).getByRole('button', { name: /new library/i })).toBeInTheDocument();
    expect(screen.queryByText(/below/i)).toBeNull();
  });
});
