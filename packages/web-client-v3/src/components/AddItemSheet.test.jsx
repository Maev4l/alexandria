import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AddItemSheet from './AddItemSheet.jsx';

// Prints both `location.state` and the query string, so a test can assert on whichever
// mechanism actually carried the collection rather than on the route path alone. Book/Film
// still travel via `state` (their destinations are unbuilt stubs, out of scope); Enter by hand
// travels via the query (its destination, NewBook, is built and must survive a cold load).
const LocationProbe = () => {
  const location = useLocation();
  return (
    <p>
      state:{location.state?.collection?.id ?? 'none'} search:{location.search || 'none'}
    </p>
  );
};

const renderAt = (destinationPath, props = {}) =>
  render(
    <MemoryRouter initialEntries={['/sheet']}>
      <Routes>
        <Route
          path="/sheet"
          element={<AddItemSheet open onClose={() => {}} libraryId="lib-1" {...props} />}
        />
        <Route path={destinationPath} element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

describe('AddItemSheet', () => {
  // Not `location.state`, unlike Book and Film: NewBook is a built screen a reader can cold-load
  // (a fresh tab, a deep link, a PWA restart resuming this exact URL), and state does not
  // survive that. The query does, which is the whole reason it moved.
  it('carries the collection into Enter by hand via the query, not location.state', async () => {
    renderAt('/libraries/:libraryId/items/new/book', {
      collection: { id: 'c1', name: 'Blake et Mortimer' },
    });
    await userEvent.click(screen.getByRole('button', { name: /enter by hand/i }));
    expect(screen.getByText('state:none search:?collectionId=c1')).toBeInTheDocument();
  });

  it('offers no Back from the header "+", where there is no menu to return to', () => {
    render(
      <MemoryRouter>
        <AddItemSheet open onClose={() => {}} libraryId="lib-1" />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: /^back$/i })).toBeNull();
  });

  it('offers Back when reached from a menu, and it returns there rather than dismissing the sheet', async () => {
    const onBack = vi.fn();
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <AddItemSheet
          open
          onClose={onClose}
          libraryId="lib-1"
          collection={{ id: 'c1', name: 'Blake et Mortimer' }}
          onBack={onBack}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /^back$/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('drops New collection when opened from a board — filing into that collection is the whole premise', () => {
    render(
      <MemoryRouter>
        <AddItemSheet
          open
          onClose={() => {}}
          libraryId="lib-1"
          collection={{ id: 'c1', name: 'Blake et Mortimer' }}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: /new collection/i })).toBeNull();
  });

  it('keeps New collection from the header "+", where no collection is assumed', () => {
    render(
      <MemoryRouter>
        <AddItemSheet open onClose={() => {}} libraryId="lib-1" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /new collection/i })).toBeInTheDocument();
  });

  it('keeps Enter by hand present from a board too — a non-camera path is never scoped away', () => {
    render(
      <MemoryRouter>
        <AddItemSheet
          open
          onClose={() => {}}
          libraryId="lib-1"
          collection={{ id: 'c1', name: 'Blake et Mortimer' }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /enter by hand/i })).toBeInTheDocument();
  });
});
