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

// THE PROBE IS ON THE IMPLEMENTATION THAT WAS RIGHT, which is the point of it.
//
// `StreamContext.patchItem` has always REPLACED the record rather than spreading over it, so this
// screen never had the search surface's defect — a returned item comes back with `lentTo` ABSENT
// (`omitempty`), and a spread cannot delete a key. But `Mark returned` was exercised only on item
// detail and on search, so the stream's correctness was by construction and nothing asserted it.
//
// That is the shape worth naming: after fixing one of two siblings, the BROKEN one gains a probe
// because it broke, and the correct one keeps having none — so a later refactor can silently make
// it the broken one. Correct-by-construction is not covered.

describe('LibraryBrowse loading skeleton', () => {
  afterEach(() => vi.unstubAllGlobals());

  // The fetch is held PENDING for the whole test rather than resolved: the skeleton is a
  // transient state, and a probe that races the resolution asserts scheduling rather than
  // behaviour. The window is the whole subject.
  it('rules the skeleton frame and does not fill it', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    renderApp('/libraries/lib-fiction');

    // `data-skeleton`, queried directly, rather than `data-testid`: this codebase marks nodes for
    // machines with `data-edge` / `data-mark`, and nothing configures a testIdAttribute
    // (verified — the default `data-testid` is in force but unused here). Follow the convention.
    let frame;
    await waitFor(() => {
      frame = document.querySelector('[data-skeleton="frame"]');
      expect(frame).not.toBeNull();
    });
    // DESIGN.md §5: "'Ruled' means the rule and nothing else — the empty frame carries no fill."
    // The bars beside it keep theirs; a bar is not a frame.
    expect(frame.className).toContain('border-2');
    expect(frame.className).not.toContain('bg-paper-deep');
  });
});
