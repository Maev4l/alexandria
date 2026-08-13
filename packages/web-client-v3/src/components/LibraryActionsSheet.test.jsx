import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LibraryActionsSheet from './LibraryActionsSheet.jsx';

const library = { id: 'lib-1', name: 'Fiction', totalItems: 412, sharedTo: ['a@b.c'] };

const renderSheet = (props = {}) =>
  render(
    <MemoryRouter>
      <LibraryActionsSheet library={library} open onClose={() => {}} {...props} />
    </MemoryRouter>,
  );

describe('LibraryActionsSheet', () => {
  it('offers edit, share, unshare and delete', () => {
    renderSheet();
    ['Edit', 'Share', 'Unshare', 'Delete'].forEach((label) => {
      expect(screen.getByRole('button', { name: new RegExp(`^${label}`, 'i') })).toBeInTheDocument();
    });
  });

  it('opens the share form inline rather than on another screen', async () => {
    renderSheet();
    await userEvent.click(screen.getByRole('button', { name: /^share/i }));
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('confirms deletion in place, before acting, and says what is destroyed', async () => {
    const onDeleted = vi.fn();
    renderSheet({ onDeleted });
    await userEvent.click(screen.getByRole('button', { name: /^delete/i }));
    expect(screen.getByText(/412 items/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('hides unshare when the library is shared with nobody', () => {
    renderSheet({ library: { ...library, sharedTo: [] } });
    expect(screen.queryByRole('button', { name: /^unshare/i })).toBeNull();
  });

  it('warns that sharing takes a moment to reach search, which is asynchronous', async () => {
    renderSheet();
    await userEvent.click(screen.getByRole('button', { name: /^share/i }));
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });
});
