import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AddItemSheet from './AddItemSheet.jsx';
import { collectionsApi } from '@/api';

// Only `list` is stubbed — nothing else in this file calls the API. This is what lets the
// reachability tests below mount the real AddBook/AddVideo stubs and the real NewBook/NewVideo
// forms, so the collection picker has something to load.
vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    collectionsApi: { ...actual.collectionsApi, list: vi.fn() },
  };
});

const AddBook = (await import('@/pages/AddBook.jsx')).default;
const AddVideo = (await import('@/pages/AddVideo.jsx')).default;
const NewBook = (await import('@/pages/NewBook.jsx')).default;
const NewVideo = (await import('@/pages/NewVideo.jsx')).default;

beforeEach(() => {
  vi.mocked(collectionsApi.list)
    .mockReset()
    .mockResolvedValue({ collections: [{ id: 'c1', name: 'Blake et Mortimer', itemCount: 4 }] });
});

// Prints both `location.state` and the query string, so a test can assert on whichever
// mechanism actually carried the collection rather than on the route path alone. Every branch
// now travels via the query: Book/Film land on AddBook/AddVideo, which are still stubs but,
// once the manual escape is added to them (Enter by hand's new home), need the collection to
// build their own link — so `location.state`, lost on a cold load, is no longer safe for them
// either.
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

// Mounted alongside the real NewBook/NewVideo in the reachability tests below, so each row
// asserts `location.state` directly rather than resting on those two forms continuing to read
// only the query. That correctness is otherwise transitive — a state-carrying regression
// upstream would starve a query-only reader and the Collection field would come up empty, which
// the field check alone already catches, but a form that started reading BOTH would silently
// keep passing on state while the field check stayed green, hiding that the mechanism had
// drifted back to state. This is the check for that: a whole item type shipped with no manual
// entry at all while 1098 tests passed, because nothing asserted state directly.
const LocationStateProbe = () => {
  const location = useLocation();
  return <p>state:{location.state === null ? 'none' : JSON.stringify(location.state)}</p>;
};

describe('AddItemSheet', () => {
  // The bug this whole round fixes: `Enter by hand` needed a type to mean anything, so it was
  // never a peer of Book/Film — putting it beside them made choosing it silently default to
  // book, with no film ever reachable by hand. Checked from BOTH entry points: the header "+"
  // (no collection) and a board (collection present), since the defect did not depend on which.
  it('never offers Enter by hand — it needs a type, which is not this sheet\'s job to assume', () => {
    render(
      <MemoryRouter>
        <AddItemSheet open onClose={() => {}} libraryId="lib-1" />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: /enter by hand/i })).toBeNull();
  });

  it('never offers Enter by hand from a board either', () => {
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
    expect(screen.queryByRole('button', { name: /enter by hand/i })).toBeNull();
  });

  it('carries the collection into Book via the query, not location.state', async () => {
    renderAt('/libraries/:libraryId/add/book', {
      collection: { id: 'c1', name: 'Blake et Mortimer' },
    });
    await userEvent.click(screen.getByRole('button', { name: /^book$/i }));
    expect(screen.getByText('state:none search:?collectionId=c1')).toBeInTheDocument();
  });

  it('carries the collection into Film via the query, not location.state', async () => {
    renderAt('/libraries/:libraryId/add/video', {
      collection: { id: 'c1', name: 'Blake et Mortimer' },
    });
    await userEvent.click(screen.getByRole('button', { name: /^film$/i }));
    expect(screen.getByText('state:none search:?collectionId=c1')).toBeInTheDocument();
  });

  it('sends no query at all from the header "+", where there is no collection to carry', async () => {
    renderAt('/libraries/:libraryId/add/book');
    await userEvent.click(screen.getByRole('button', { name: /^book$/i }));
    expect(screen.getByText('state:none search:none')).toBeInTheDocument();
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

  // The replacement for the test that pinned the original bug in place ("keeps Enter by hand
  // present from a board too"). After removing Enter by hand from this sheet, EVERY path to add
  // an item runs through a stub (AddBook/AddVideo), so what needs verifying is not "is the
  // control here" but "does each of the four real paths actually arrive, with the collection
  // carried correctly end to end" — a bare URL, no router state, exactly what a cold load looks
  // like. A removed test with no replacement is how the original bug shipped unnoticed.
  describe('reachability: every path runs through a stub, end to end', () => {
    it('header "+" → Book → the stub\'s escape → NewBook, no collection', async () => {
      render(
        <MemoryRouter initialEntries={['/libraries/lib-1']}>
          <Routes>
            <Route
              path="/libraries/:libraryId"
              element={<AddItemSheet open onClose={() => {}} libraryId="lib-1" />}
            />
            <Route path="/libraries/:libraryId/add/book" element={<AddBook />} />
            <Route
              path="/libraries/:libraryId/items/new/book"
              element={
                <>
                  <LocationStateProbe />
                  <NewBook />
                </>
              }
            />
          </Routes>
        </MemoryRouter>,
      );
      await userEvent.click(screen.getByRole('button', { name: /^book$/i }));
      await userEvent.click(await screen.findByRole('button', { name: /enter by hand/i }));
      expect(await screen.findByText('state:none')).toBeInTheDocument();
      expect(screen.getByLabelText(/^collection$/i)).toHaveValue('');
    });

    it('header "+" → Film → the stub\'s escape → NewVideo, no collection', async () => {
      render(
        <MemoryRouter initialEntries={['/libraries/lib-1']}>
          <Routes>
            <Route
              path="/libraries/:libraryId"
              element={<AddItemSheet open onClose={() => {}} libraryId="lib-1" />}
            />
            <Route path="/libraries/:libraryId/add/video" element={<AddVideo />} />
            <Route
              path="/libraries/:libraryId/items/new/video"
              element={
                <>
                  <LocationStateProbe />
                  <NewVideo />
                </>
              }
            />
          </Routes>
        </MemoryRouter>,
      );
      await userEvent.click(screen.getByRole('button', { name: /^film$/i }));
      await userEvent.click(await screen.findByRole('button', { name: /enter by hand/i }));
      expect(await screen.findByText('state:none')).toBeInTheDocument();
      expect(screen.getByLabelText(/^collection$/i)).toHaveValue('');
    });

    it('collection board → Book → the stub\'s escape → NewBook, collection selected', async () => {
      render(
        <MemoryRouter initialEntries={['/libraries/lib-1']}>
          <Routes>
            <Route
              path="/libraries/:libraryId"
              element={
                <AddItemSheet
                  open
                  onClose={() => {}}
                  libraryId="lib-1"
                  collection={{ id: 'c1', name: 'Blake et Mortimer' }}
                />
              }
            />
            <Route path="/libraries/:libraryId/add/book" element={<AddBook />} />
            <Route
              path="/libraries/:libraryId/items/new/book"
              element={
                <>
                  <LocationStateProbe />
                  <NewBook />
                </>
              }
            />
          </Routes>
        </MemoryRouter>,
      );
      await userEvent.click(screen.getByRole('button', { name: /^book$/i }));
      await userEvent.click(await screen.findByRole('button', { name: /enter by hand/i }));
      // Not just "the field ends up right" — it must end up right BECAUSE OF THE QUERY. A form
      // that quietly started reading `location.state` too would still show 'c1' here even after
      // the mechanism regressed; asserting state is none is what catches that, rather than
      // resting on NewBook's own source being read correctly.
      expect(await screen.findByText('state:none')).toBeInTheDocument();
      // Anchored: a loose /collection/i also matches "Order in the collection".
      expect(screen.getByLabelText(/^collection$/i)).toHaveValue('c1');
    });

    it('collection board → Film → the stub\'s escape → NewVideo, collection selected', async () => {
      render(
        <MemoryRouter initialEntries={['/libraries/lib-1']}>
          <Routes>
            <Route
              path="/libraries/:libraryId"
              element={
                <AddItemSheet
                  open
                  onClose={() => {}}
                  libraryId="lib-1"
                  collection={{ id: 'c1', name: 'Blake et Mortimer' }}
                />
              }
            />
            <Route path="/libraries/:libraryId/add/video" element={<AddVideo />} />
            <Route
              path="/libraries/:libraryId/items/new/video"
              element={
                <>
                  <LocationStateProbe />
                  <NewVideo />
                </>
              }
            />
          </Routes>
        </MemoryRouter>,
      );
      await userEvent.click(screen.getByRole('button', { name: /^film$/i }));
      await userEvent.click(await screen.findByRole('button', { name: /enter by hand/i }));
      expect(await screen.findByText('state:none')).toBeInTheDocument();
      expect(screen.getByLabelText(/^collection$/i)).toHaveValue('c1');
    });
  });
});
