import { render, screen, waitFor, within } from '@testing-library/react';
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

// `state` is how a real opener reaches this screen — `ItemActionsSheet` and `ItemDetail` both
// hand the item's type over on the way here. Passing an entry OBJECT rather than a string is what
// lets these tests exercise that path; the default stays a bare string, which is the cold load.
const renderPage = (entry = '/libraries/lib1/items/item-1/edit') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
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

// The header used to print `Edit item` while the fetch was in flight and then swap it for
// `Edit book`, which a reader sees as the app correcting itself a beat after they tapped Edit.
//
// EVERY PROBE BELOW HOLDS THE LOADING STATE OPEN with a promise that never settles. A probe that
// let the fetch resolve would assert the final title, which was never in doubt — the defect lives
// entirely in the frames before it, and a test that cannot see those frames cannot see the bug.
describe('EditItem — the header names the screen without first guessing', () => {
  const pending = () => new Promise(() => {});

  const header = () => within(document.querySelector('header'));

  it('prints the type-specific name while the fetch is still in flight, when the opener supplied it', () => {
    vi.mocked(itemsApi.get).mockImplementation(pending);
    renderPage({ pathname: '/libraries/lib1/items/item-1/edit', state: { type: 1 } });

    expect(header().getByText('Edit film')).toBeInTheDocument();
    expect(header().queryByText('Edit item')).toBeNull();
  });

  // Type 0 is a book, and 0 is falsy: read with `||` instead of `??` the hint would be discarded
  // and every book would arrive at this screen as a film for the length of the fetch. This is the
  // probe that discriminates between the two operators — the film case above passes under both.
  it('reads a book hint, which is the falsy one', () => {
    vi.mocked(itemsApi.get).mockImplementation(pending);
    renderPage({ pathname: '/libraries/lib1/items/item-1/edit', state: { type: 0 } });

    expect(header().getByText('Edit book')).toBeInTheDocument();
    expect(header().queryByText('Edit film')).toBeNull();
  });

  // A cold load or a refresh has no opener to have supplied anything. The header stays SILENT
  // rather than guessing — the same construction LibraryBrowse uses for a library it has not
  // fetched — while the landmark still carries a real name, because an unnamed <h1> is a defect
  // where a quiet header is not.
  it('prints no name at all on a cold load, and never the wrong one', () => {
    vi.mocked(itemsApi.get).mockImplementation(pending);
    renderPage();

    expect(header().queryByText(/^Edit /)).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Edit item' })).toBeInTheDocument();
  });

  // The hint is an optimisation and never the record. Were it treated as the truth, an opener
  // navigating with a stale type — or any future caller passing the wrong one — would leave this
  // screen mislabelled for as long as the reader stayed on it.
  it('lets the fetched type overrule a wrong hint', async () => {
    renderPage({ pathname: '/libraries/lib1/items/item-1/edit', state: { type: 1 } });

    expect(header().getByText('Edit film')).toBeInTheDocument();
    await waitFor(() => expect(header().getByText('Edit book')).toBeInTheDocument());
  });
});
