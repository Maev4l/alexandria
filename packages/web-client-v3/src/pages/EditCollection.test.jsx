import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EditCollection from './EditCollection.jsx';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/libraries/lib-1/collections/col-1/edit']}>
      <Routes>
        <Route
          path="/libraries/:libraryId/collections/:collectionId/edit"
          element={<EditCollection />}
        />
      </Routes>
    </MemoryRouter>,
  );

const jsonResponse = (body, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => body,
});

// The GET (load) always succeeds; only the PUT (save) response varies per test, so `fetch` is
// routed by method rather than answering every call identically.
const stubSave = (body, { ok = false, status = 409 } = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url, options) =>
      (options?.method ?? 'GET') === 'GET'
        ? jsonResponse({ id: 'col-1', name: 'Melville', description: 'Sea stories' })
        : jsonResponse(body, { ok, status }),
    ),
  );

beforeEach(() => stubSave({ id: 'col-1' }, { ok: true, status: 200 }));
afterEach(() => vi.unstubAllGlobals());

describe('EditCollection', () => {
  // The same fix as NewCollection.jsx, mirrored here: 409 is the real status
  // handlers/collections.go sends for a duplicate name, matched on status rather than on the
  // server's wording, which api/client.js no longer carries through to `err.message` at all.
  it('shows a duplicate name on the field, not as a page-level error', async () => {
    stubSave({ message: 'collection with this name already exists' }, { ok: false, status: 409 });
    renderPage();

    const field = await screen.findByLabelText(/name/i);
    expect(field).toHaveValue('Melville');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await vi.waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByText(/already a collection called/i)).toBeInTheDocument();
    expect(screen.queryByText('collection with this name already exists')).toBeNull();
  });

  it('shows a non-duplicate save failure as a page-level, app-authored message', async () => {
    stubSave({ message: 'internal failure xyz' }, { ok: false, status: 500 });
    renderPage();

    await screen.findByLabelText(/name/i);
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/went wrong/i);
    expect(screen.queryByText('internal failure xyz')).toBeNull();
  });
});
