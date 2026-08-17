import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collectionsApi } from '@/api';

vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    collectionsApi: { ...actual.collectionsApi, list: vi.fn() },
  };
});

const NewBook = (await import('./NewBook.jsx')).default;

const collections = [{ id: 'c1', name: 'Blake et Mortimer', itemCount: 4 }];

beforeEach(() => {
  vi.mocked(collectionsApi.list).mockReset().mockResolvedValue({ collections });
});

// A plain string entry, deliberately — MemoryRouter attaches no `state` to it, which is exactly
// what a cold load (a fresh tab, a deep link, a PWA restart resuming this URL) looks like. This
// is the case `location.state` could never satisfy, and the reason the collection now travels
// in the query instead.
const renderAt = (query = '') =>
  render(
    <MemoryRouter initialEntries={[`/libraries/lib-1/items/new/book${query}`]}>
      <Routes>
        <Route path="/libraries/:libraryId/items/new/book" element={<NewBook />} />
      </Routes>
    </MemoryRouter>,
  );

// Confirms the route entry above genuinely carries no state, so the test that follows is not
// accidentally passing on a leftover mechanism.
const LocationStateProbe = () => {
  const location = useLocation();
  return <p>state:{location.state === null ? 'none' : JSON.stringify(location.state)}</p>;
};

describe('NewBook', () => {
  it('pre-selects the collection carried in the query, instead of leaving it None', async () => {
    renderAt('?collectionId=c1');
    // Anchored: "Order in the collection" would also match a loose /collection/i and this
    // form renders both labels once a collection is selected.
    expect(await screen.findByLabelText(/^collection$/i)).toHaveValue('c1');
    // The order field appears once a collection is chosen (ItemForm's own behaviour) but must
    // stay EMPTY: the pair invariant belongs to the reader, not the handoff — the server ranks
    // an order-less item last on its own, so seeding one here would be inventing it.
    expect(screen.getByLabelText(/order in the collection/i)).toHaveValue(null);
  });

  it('leaves the collection at None with no query at all — the header "+" case', async () => {
    renderAt();
    expect(await screen.findByLabelText(/^collection$/i)).toHaveValue('');
  });

  // The whole point of moving off `location.state`: a cold load has no router state whatsoever,
  // only the query in the URL. `location.state` could never satisfy this case — there is
  // nothing upstream to have set it — which is exactly the defect this replaces.
  it('survives a cold load with no router state at all — only the query string', async () => {
    render(
      <MemoryRouter initialEntries={['/libraries/lib-1/items/new/book?collectionId=c1']}>
        <Routes>
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
    expect(screen.getByText('state:none')).toBeInTheDocument();
    expect(await screen.findByLabelText(/^collection$/i)).toHaveValue('c1');
  });
});
