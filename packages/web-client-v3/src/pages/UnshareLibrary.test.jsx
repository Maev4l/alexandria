import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { librariesApi } from '@/api';

vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, librariesApi: { ...actual.librariesApi, unshare: vi.fn(async () => {}) } };
});

const library = {
  id: 'lib1',
  name: 'Fiction',
  totalItems: 3,
  sharedTo: ['marie@example.com', 'paul@example.com'],
};

vi.mock('@/state/LibrariesContext.jsx', () => ({
  useLibraries: () => ({ byId: () => library, refresh: vi.fn() }),
}));

const UnshareLibrary = (await import('./UnshareLibrary.jsx')).default;

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/libraries/lib1/unshare']}>
      <Routes>
        <Route path="/libraries/:libraryId/unshare" element={<UnshareLibrary />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => vi.mocked(librariesApi.unshare).mockClear());

// Revoking another person's access is at least as consequential as deleting your own library,
// and delete confirms in place while this fired on the first tap. Same weight, same treatment.
// DESIGN.md §3: mono is for numerals only, and an email address is content the reader authored
// (a NAME, not a numeral) — the third instance of the same category error this sweep found
// (the other two were LedgerRow's durations and IndexLetter's "volume(s)").
it('never sets a reader\'s address in the mono — that is a name, not a numeral', () => {
  renderPage();
  const row = screen.getByRole('button', { name: /marie@example.com/i });
  expect(row.querySelector('.num')).toBeNull();
});

describe('removing a reader\'s access', () => {
  it('confirms in place before revoking', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /marie@example.com/i }));
    await userEvent.click(screen.getByRole('button', { name: /^remove 1$/i }));

    // Nothing has happened yet.
    expect(librariesApi.unshare).not.toHaveBeenCalled();
    // And the confirmation says what it will do.
    expect(screen.getByText(/lose access/i)).toBeInTheDocument();
  });

  it('revokes once confirmed', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /marie@example.com/i }));
    await userEvent.click(screen.getByRole('button', { name: /^remove 1$/i }));
    await userEvent.click(screen.getByRole('button', { name: /remove for good/i }));

    expect(librariesApi.unshare).toHaveBeenCalledWith('lib1', ['marie@example.com']);
  });

  it('can be backed out of, keeping the selection', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /marie@example.com/i }));
    await userEvent.click(screen.getByRole('button', { name: /^remove 1$/i }));
    await userEvent.click(screen.getByRole('button', { name: /keep access/i }));

    expect(librariesApi.unshare).not.toHaveBeenCalled();
    // The selection survives, so backing out costs nothing.
    expect(screen.getByRole('button', { name: /^remove 1$/i })).toBeInTheDocument();
  });
});

it('frames the not-shared state, and offers no action, because this screen cannot share', async () => {
  // The mocked library above carries two recipients for the tests that need them. `library` is
  // a plain object captured by the mock factory's closure, so mutating its property (rather than
  // rebinding a second `vi.mock`) is enough to exercise the empty case — restored in `finally` so
  // this test's mutation cannot leak into another test's expectations regardless of run order.
  library.sharedTo = [];
  try {
    renderPage();

    const notice = await screen.findByText(/not shared with anyone/i);
    const frame = notice.closest('div');
    expect(frame.className).toContain('border-2');
    expect(frame.className).toContain('border-ink');
    // Nothing on this screen can share a library, so no action is offered here — only the
    // absence proves the frame was not padded out with an invented control.
    expect(screen.queryByRole('button', { name: /share/i })).toBeNull();
  } finally {
    library.sharedTo = ['marie@example.com', 'paul@example.com'];
  }
});
