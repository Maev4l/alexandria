import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collectionsApi, itemsApi } from '@/api';

vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    itemsApi: { ...actual.itemsApi, get: vi.fn(), updateBook: vi.fn() },
    collectionsApi: { ...actual.collectionsApi, list: vi.fn() },
  };
});

const EditItem = (await import('./EditItem.jsx')).default;

const book = { id: 'item-1', type: 0, title: 'Nadja', authors: ['André Breton'], updatedAt: '2026-01-01' };

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/libraries/lib1/items/item-1/edit']}>
      <Routes>
        <Route path="/libraries/:libraryId/items/:itemId/edit" element={<EditItem />} />
        {/* A stand-in for ItemDetail: only its presence matters here, to prove navigation
            actually happened, and happened only once the re-read resolved. */}
        <Route path="/libraries/:libraryId/items/:itemId" element={<p>ITEM DETAIL</p>} />
      </Routes>
    </MemoryRouter>,
  );

let sequence;

beforeEach(() => {
  sequence = [];
  vi.mocked(itemsApi.get).mockReset().mockImplementation(async () => {
    sequence.push('get');
    return book;
  });
  // The real PUT returns an empty body — modelled here as `null` — which is exactly why the
  // caller cannot trust its return value and must re-read instead.
  vi.mocked(itemsApi.updateBook).mockReset().mockImplementation(async () => {
    sequence.push('updateBook');
    return null;
  });
  vi.mocked(collectionsApi.list).mockReset().mockImplementation(async () => ({ collections: [] }));
});

describe('EditItem', () => {
  it('re-reads the item after the write, in order, before navigating — PUT returns no body', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(screen.getByText('ITEM DETAIL')).toBeInTheDocument());

    // The one fact this test exists to pin: write, THEN re-read, THEN (and only then) leave the
    // page. A `get` that arrived before `updateBook`, or navigation racing ahead of the second
    // `get`, would both slip through a looser assertion like "both were called".
    expect(sequence).toEqual(['get', 'updateBook', 'get']);
  });
});
