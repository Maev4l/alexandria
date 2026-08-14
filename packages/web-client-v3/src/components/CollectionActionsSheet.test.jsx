import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import CollectionActionsSheet from './CollectionActionsSheet.jsx';
import { ToastProvider } from '@/state/ToastContext.jsx';

const board = { id: 'c1', title: 'Melville', itemCount: 4 };

const renderSheet = (props = {}) =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <CollectionActionsSheet
          board={board}
          libraryId="lib-1"
          open
          onClose={() => {}}
          {...props}
        />
      </ToastProvider>
    </MemoryRouter>,
  );

describe('CollectionActionsSheet', () => {
  it('offers edit and delete', () => {
    renderSheet();
    expect(screen.getByRole('button', { name: /^edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^delete/i })).toBeInTheDocument();
  });

  it('says the items survive, because deleting a collection orphans rather than deletes', async () => {
    renderSheet();
    await userEvent.click(screen.getByRole('button', { name: /^delete/i }));
    expect(screen.getByText(/4 items stay in this library/i)).toBeInTheDocument();
    // The confirming action is named for what it does, not "delete".
    expect(screen.getByRole('button', { name: /remove the grouping/i })).toBeInTheDocument();
  });
});
