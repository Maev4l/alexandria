import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

const renderAt = (state) =>
  render(
    <MemoryRouter
      initialEntries={[{ pathname: '/libraries/lib-1/items/new/book', state }]}
    >
      <Routes>
        <Route path="/libraries/:libraryId/items/new/book" element={<NewBook />} />
      </Routes>
    </MemoryRouter>,
  );

describe('NewBook', () => {
  it('pre-selects the collection carried in location.state, instead of leaving it None', async () => {
    renderAt({ collection: { id: 'c1', name: 'Blake et Mortimer' } });
    // Anchored: "Order in the collection" would also match a loose /collection/i and this
    // form renders both labels once a collection is selected.
    expect(await screen.findByLabelText(/^collection$/i)).toHaveValue('c1');
    // The order field appears once a collection is chosen (ItemForm's own behaviour) but must
    // stay EMPTY: the pair invariant belongs to the reader, not the handoff — the server ranks
    // an order-less item last on its own, so seeding one here would be inventing it.
    expect(screen.getByLabelText(/order in the collection/i)).toHaveValue(null);
  });

  it('leaves the collection at None with no state at all — the header "+" case', async () => {
    renderAt(undefined);
    expect(await screen.findByLabelText(/^collection$/i)).toHaveValue('');
  });
});
