import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
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

// Prints whatever `location.state` carried, so the test can assert on the collection that
// travelled with the navigation rather than on the route path alone.
const LocationProbe = () => {
  const location = useLocation();
  return <p>collection:{location.state?.collection?.id ?? 'none'}</p>;
};

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

  it('offers Add an item first, without repeating the collection name', () => {
    renderSheet({ board: { id: 'c1', title: 'Blake et Mortimer', itemCount: 4 } });
    // Excludes the sheet's own "Close" (×), which sits first in the DOM but is not one of
    // this menu's actions.
    const actions = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-label') !== 'Close');
    // The heading already carries the name (Sheet title = board.title); the entry itself
    // must not say it twice.
    expect(actions[0]).toHaveAccessibleName(/add an item/i);
    expect(actions[0]).not.toHaveAccessibleName(/blake/i);
  });

  it('carries the collection into the add route, exactly as the header + does plus the collection', async () => {
    render(
      <MemoryRouter initialEntries={['/sheet']}>
        <ToastProvider>
          <Routes>
            <Route
              path="/sheet"
              element={
                <CollectionActionsSheet
                  board={{ id: 'c1', title: 'Blake et Mortimer', itemCount: 4 }}
                  libraryId="lib-1"
                  open
                  onClose={() => {}}
                />
              }
            />
            <Route path="/libraries/:libraryId/add/book" element={<LocationProbe />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /add an item/i }));
    await userEvent.click(screen.getByRole('button', { name: /^book$/i }));

    expect(screen.getByText('collection:c1')).toBeInTheDocument();
  });
});
