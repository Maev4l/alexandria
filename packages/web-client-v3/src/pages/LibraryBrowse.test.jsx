import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp, stubFetch } from '@/test/appHarness.jsx';

// `lib-empty` is owned by this fixture user (no `sharedFrom`), which is what makes the add
// control render at all — the same gate routeExits.test.jsx already mocks this way.
vi.mock('@/auth/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { id: 'OWNER1', initials: 'JR', email: 'jr@example.com', approved: true } }),
}));

// The critique's second finding: an empty OWNED library told the reader to "Add the first
// volume with the plus above" — spatial recall pointing at an unlabelled header icon, meaningless
// in a linear reading order, and exactly what DESIGN.md §6 forbids ("recovery is a control,
// never an instruction to perform a gesture"). This is the whole body of that screen, so the fix
// gives it its own control rather than describing one elsewhere. `lib-empty` in the shared
// fixtures is owned (no `sharedFrom`) with `totalItems: 0` and zero items in the mock store.
describe('LibraryBrowse empty state', () => {
  beforeEach(stubFetch);
  afterEach(() => vi.unstubAllGlobals());

  it('offers its own control instead of pointing at "the plus above"', async () => {
    renderApp('/libraries/lib-empty');

    await waitFor(() => expect(screen.getByText(/nothing filed here yet/i)).toBeInTheDocument());

    expect(screen.queryByText(/plus above/i)).toBeNull();
    expect(
      screen.getByRole('button', { name: /add the first volume/i }),
    ).toBeInTheDocument();
  });

  it('the empty-state control actually opens the add sheet — same action as the header plus', async () => {
    renderApp('/libraries/lib-empty');

    await waitFor(() => expect(screen.getByText(/nothing filed here yet/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /add the first volume/i }));

    expect(await screen.findByText(/add to this library/i)).toBeInTheDocument();
  });
});
