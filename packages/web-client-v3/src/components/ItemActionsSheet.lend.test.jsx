import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ItemActionsSheet from './ItemActionsSheet.jsx';

vi.mock('@/state/ToastContext.jsx', () => ({
  useToast: () => ({ confirm: vi.fn() }),
}));

const item = { id: 'i1', title: 'Le Petit Prince' };

const openSheet = () =>
  render(
    <MemoryRouter>
      <ItemActionsSheet item={item} libraryId="lib1" open onClose={vi.fn()} onChanged={vi.fn()} />
    </MemoryRouter>,
  );

// LEND IS A ONE-WAY DOOR. Delete mode pairs its action with "Keep it"; lend offers only the name
// field and "Record the loan". A reader who taps Lend by mistake has no way back to the menu —
// Escape, which a phone does not have, or the scrim, which aria-modal hides from assistive tech.
// The same component models the same pattern two different ways.
describe('lend mode', () => {
  it('can be left, the way delete mode can', async () => {
    openSheet();
    await userEvent.click(screen.getByRole('button', { name: /^lend$/i }));

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /back/i }));

    // Back at the menu, with the original choices.
    expect(screen.getByRole('button', { name: /^lend$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('pairs its primary with the secondary, as delete does', async () => {
    openSheet();
    await userEvent.click(screen.getByRole('button', { name: /^lend$/i }));
    // At rest the primary's slot holds the reason, not a disabled twin of "Back" (the action
    // slot's second form) — the pairing is proven by typing a name and seeing both controls together.
    await userEvent.type(screen.getByLabelText(/who has it/i), 'Marie');
    expect(screen.getByRole('button', { name: /record the loan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });
});

// The same defect in the sibling component, found while fixing lend. Every mode that a reader
// can enter must be a mode they can leave; the two sheets now model it identically.
describe('share mode on a library', () => {
  it('can be left too', async () => {
    const { default: LibraryActionsSheet } = await import('./LibraryActionsSheet.jsx');
    const library = { id: 'lib1', name: 'Fiction', totalItems: 3, sharedTo: [] };
    render(
      <MemoryRouter>
        <LibraryActionsSheet library={library} open onClose={vi.fn()} onChanged={vi.fn()} />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /^share$/i }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /back/i }));

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });
});
