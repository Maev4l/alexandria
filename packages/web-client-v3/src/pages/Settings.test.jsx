import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Settings from './Settings.jsx';

const signOut = vi.fn(async () => {});

vi.mock('@/auth/AuthContext.jsx', () => ({
  useAuth: () => ({ signOut }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  );

describe('Settings', () => {
  it('names itself in the header and drops the wordmark', () => {
    renderPage();
    // ui-v3.md §2: a screen that becomes real takes back plus its own name. A finished screen
    // still showing the wordmark beside a back control is announcing it has nothing to call
    // itself, which for a built screen is a defect rather than a fallback.
    expect(within(screen.getByRole('banner')).getByText('Settings')).toBeInTheDocument();
    expect(screen.queryByText('Alexandria')).not.toBeInTheDocument();
  });

  it('reaches Account and About', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /account/i })).toHaveAttribute('href', '/settings/account');
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '/settings/about');
  });

  it('signs out on one press, with no confirmation in the way', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));

    // §7 reserves confirmation for what is actually destructive, and signing out destroys
    // nothing. One press does it — no sheet, no second control to find.
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('states the consequence of signing out', () => {
    renderPage();
    expect(screen.getByText(/sign in again/i)).toBeInTheDocument();
  });

  it('offers no account deletion, because the API has no such endpoint', () => {
    renderPage();
    // §9's rule against implying data the backend lacks covers ACTIONS as well as fields:
    // deleting an account exists only in the admin CLI.
    expect(document.body.textContent).not.toMatch(/delete/i);
  });
});
