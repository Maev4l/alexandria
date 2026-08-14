import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NewCollection from './NewCollection.jsx';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/libraries/lib-1/collections/new']}>
      <Routes>
        <Route path="/libraries/:libraryId/collections/new" element={<NewCollection />} />
      </Routes>
    </MemoryRouter>,
  );

const respond = (body, ok = true, status = 200) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok,
      status,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => body,
    })),
  );

beforeEach(() => respond({ id: 'new' }));
afterEach(() => vi.unstubAllGlobals());

describe('NewCollection', () => {
  it('honours the API limits on both fields', () => {
    renderPage();
    expect(screen.getByLabelText(/name/i)).toHaveAttribute('maxLength', '100');
    expect(screen.getByLabelText(/description/i)).toHaveAttribute('maxLength', '500');
  });

  it('shows a duplicate name on the field, not as a page-level error', async () => {
    respond({ message: 'Collection name already exists' }, false, 400);
    renderPage();
    await userEvent.type(screen.getByLabelText(/name/i), 'Melville');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    const field = screen.getByLabelText(/name/i);
    await vi.waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByText(/already a collection called/i)).toBeInTheDocument();
  });

  it('keeps the action out of reach until there is a name', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
  });
});
