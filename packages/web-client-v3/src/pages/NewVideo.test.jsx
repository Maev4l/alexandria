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

const NewVideo = (await import('./NewVideo.jsx')).default;

const collections = [{ id: 'c1', name: 'Blake et Mortimer', itemCount: 4 }];

beforeEach(() => {
  vi.mocked(collectionsApi.list).mockReset().mockResolvedValue({ collections });
});

// A plain string entry, deliberately — MemoryRouter attaches no `state` to it, which is exactly
// what a cold load (a fresh tab, a deep link, a PWA restart resuming this URL) looks like.
const renderAt = (query = '') =>
  render(
    <MemoryRouter initialEntries={[`/libraries/lib-1/items/new/video${query}`]}>
      <Routes>
        <Route path="/libraries/:libraryId/items/new/video" element={<NewVideo />} />
      </Routes>
    </MemoryRouter>,
  );

// Confirms the route entry genuinely carries no state, so the cold-load test below is not
// accidentally passing on a leftover mechanism.
const LocationStateProbe = () => {
  const location = useLocation();
  return <p>state:{location.state === null ? 'none' : JSON.stringify(location.state)}</p>;
};

describe('NewVideo', () => {
  it('pre-selects the collection carried in the query, instead of leaving it None', async () => {
    renderAt('?collectionId=c1');
    // Anchored: "Order in the collection" would also match a loose /collection/i.
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
  // only the query in the URL.
  it('survives a cold load with no router state at all — only the query string', async () => {
    render(
      <MemoryRouter initialEntries={['/libraries/lib-1/items/new/video?collectionId=c1']}>
        <Routes>
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
    expect(screen.getByText('state:none')).toBeInTheDocument();
    expect(await screen.findByLabelText(/^collection$/i)).toHaveValue('c1');
  });
});
