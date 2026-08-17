import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CollectionActionsSheet from './CollectionActionsSheet.jsx';
import { ToastProvider } from '@/state/ToastContext.jsx';
import { collectionsApi } from '@/api';
import NewBook from '@/pages/NewBook.jsx';

// Only `list` is stubbed — `remove` stays the real implementation, since no test here calls
// it against an unstubbed `fetch`. This is what lets the full-path test below mount the real
// NewBook at the destination route and see its own collection picker load.
vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    collectionsApi: { ...actual.collectionsApi, list: vi.fn() },
  };
});

const board = { id: 'c1', title: 'Melville', itemCount: 4 };

beforeEach(() => {
  vi.mocked(collectionsApi.list)
    .mockReset()
    .mockResolvedValue({ collections: [{ id: 'c1', name: 'Blake et Mortimer', itemCount: 4 }] });
});

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

  // The Book/Film chooser is an in-place sub-mode of THIS sheet (the same shape as
  // LibraryActionsSheet's Share), not a route change — so unlike Edit, which leaves via
  // navigation, closing it with only a forward exit is a one-way door. Back repairs that,
  // the same way it already does for Share and Lend.
  it('does not leave the Book/Film chooser as a one-way door — Back returns to the menu', async () => {
    renderSheet();
    await userEvent.click(screen.getByRole('button', { name: /add an item/i }));
    expect(screen.getByRole('button', { name: /^book$/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^back$/i }));
    expect(screen.getByRole('button', { name: /^edit/i })).toBeInTheDocument();
  });

  it('carries the collection through Enter by hand to the manual form, already selected', async () => {
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
            <Route path="/libraries/:libraryId/items/new/book" element={<NewBook />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /add an item/i }));
    await userEvent.click(screen.getByRole('button', { name: /enter by hand/i }));

    // Anchored: a loose /collection/i also matches "Order in the collection", which this form
    // renders once a collection is selected.
    expect(await screen.findByLabelText(/^collection$/i)).toHaveValue('c1');
  });
});
