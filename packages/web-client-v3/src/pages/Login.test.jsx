import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login.jsx';

const auth = {
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  oauthMessage: null,
};

vi.mock('@/auth/AuthContext.jsx', () => ({ useAuth: () => auth }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

const submit = async (password = 'Secret1!') => {
  await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
  // Exact match, not the earlier /password/i regex: the reveal-mark button now carries its own
  // "Show password" / "Hide password" aria-label, and a substring match would find both.
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
};

beforeEach(() => {
  auth.signIn.mockReset();
  auth.oauthMessage = null;
});

describe('Login', () => {
  it('offers email, password, the primary action and Google', () => {
    renderPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
  });

  it('explains pending approval in words when Cognito says the user is unconfirmed', async () => {
    auth.signIn.mockRejectedValueOnce({ name: 'UserNotConfirmedException' });
    renderPage();
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(/pending approval/i);
  });

  it('reports bad credentials inline, naming the cause', async () => {
    auth.signIn.mockRejectedValueOnce({ name: 'NotAuthorizedException' });
    renderPage();
    await submit('wrong');
    expect(await screen.findByRole('alert')).toHaveTextContent(/email or password/i);
  });

  it('shows an account link as the success it is, not as an error', () => {
    auth.oauthMessage = { type: 'success', text: 'Your Google account is linked.' };
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent(/linked/i);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('links to sign-up', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute('href', '/signup');
  });

  // --imprint on --paper-deep computes to ~1.42:1, and that rule was the notice's only
  // distinguishing mark — at that ratio yellow cannot describe a form on its own, which is
  // exactly the failure that ratio produces, in the one place nobody had scoped the rule out of.
  it('prints the OAuth success notice with an ink rule, not an invisible yellow one', () => {
    auth.oauthMessage = { type: 'success', text: 'Your Google account has been linked.' };
    renderPage();
    const notice = screen.getByRole('status');
    expect(notice.className).toContain('border-ink');
    expect(notice.className).not.toContain('border-imprint');
  });
});
