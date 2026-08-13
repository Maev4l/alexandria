import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { libraries } from '@/test/fixtures';
import Libraries from './Libraries.jsx';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';

const renderPage = () =>
  render(
    <MemoryRouter>
      <LibrariesProvider>
        <Libraries />
      </LibrariesProvider>
    </MemoryRouter>,
  );

const respondWith = (body, ok = true, status = 200) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok,
      status,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => body,
    })),
  );

beforeEach(() => respondWith({ libraries }));
afterEach(() => vi.unstubAllGlobals());

describe('Libraries', () => {
  it('splits the list into mine and shared with me, mine first', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Fiction')).toBeInTheDocument());
    const heads = screen.getAllByRole('separator');
    expect(heads[0]).toHaveTextContent(/mine/i);
    expect(heads[1]).toHaveTextContent(/shared with me/i);
  });

  it('counts each section', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Fiction')).toBeInTheDocument());
    expect(screen.getAllByRole('separator')[0]).toHaveTextContent('3');
    expect(screen.getAllByRole('separator')[1]).toHaveTextContent('1');
  });

  it('offers the primary action to create a library', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: /new library/i })).toBeInTheDocument();
  });

  it('offers actions on owned rows and none on a shared-with-me row', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Fiction')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /actions for fiction/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /actions for polars/i })).toBeNull();
  });

  it('reports a failure inline rather than only as a toast', async () => {
    respondWith({ message: 'Failed to load libraries' }, false, 500);
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load libraries/i);
  });
});
