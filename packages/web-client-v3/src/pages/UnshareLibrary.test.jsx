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
