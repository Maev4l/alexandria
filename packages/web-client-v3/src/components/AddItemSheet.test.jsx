import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AddItemSheet from './AddItemSheet.jsx';

// Prints whatever `location.state` carried, so a test can assert on what travelled with the
// navigation rather than on the route path alone.
const LocationProbe = () => {
  const location = useLocation();
  return <p>collection:{location.state?.collection?.id ?? 'none'}</p>;
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
  it('carries the collection into Enter by hand, the same way it does Book and Film', async () => {
    renderAt('/libraries/:libraryId/items/new/book', {
      collection: { id: 'c1', name: 'Blake et Mortimer' },
    });
    await userEvent.click(screen.getByRole('button', { name: /enter by hand/i }));
    expect(screen.getByText('collection:c1')).toBeInTheDocument();
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
