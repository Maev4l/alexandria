import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import NewLibrary from './NewLibrary.jsx';

vi.mock('@/state/LibrariesContext.jsx', () => ({
  useLibraries: () => ({ refresh: vi.fn() }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <NewLibrary />
    </MemoryRouter>,
  );

describe('NewLibrary', () => {
  it('counts the characters left, because 20 is short enough to hit', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/name/i), 'Fiction');
    expect(screen.getByText('13')).toBeInTheDocument();
  });

  it('stops both fields at the API limits rather than letting the server reject them', () => {
    renderPage();
    expect(screen.getByLabelText(/name/i)).toHaveAttribute('maxLength', '20');
    expect(screen.getByLabelText(/description/i)).toHaveAttribute('maxLength', '100');
  });

  it('keeps the primary action unavailable until there is a name', async () => {
    renderPage();
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/name/i), 'Fiction');
    expect(screen.getByRole('button', { name: /create/i })).toBeEnabled();
  });
});
