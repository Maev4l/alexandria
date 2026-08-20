import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Account from './Account.jsx';
import { ToastProvider } from '@/state/ToastContext.jsx';

const changePassword = vi.fn(async () => {});

// A NATIVE reader by default: a plain email username, which is what Cognito stores for anyone
// who signed up with a password.
const NATIVE_USER = {
  id: '4C1B7E902A5D6F3814B0E7C29D5A6034',
  email: 'jr@example.com',
  username: 'jr@example.com',
  initials: 'JR',
};

let currentUser = NATIVE_USER;

vi.mock('@/auth/AuthContext.jsx', () => ({
  useAuth: () => ({ user: currentUser, changePassword }),
}));

const renderPage = () =>
  render(
    <ToastProvider>
      <MemoryRouter>
        <Account />
      </MemoryRouter>
    </ToastProvider>,
  );

let writeText;

beforeEach(() => {
  currentUser = NATIVE_USER;
  writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Account', () => {
  it('names itself in the header and drops the wordmark', () => {
    renderPage();
    expect(within(screen.getByRole('banner')).getByText('Account')).toBeInTheDocument();
    expect(screen.queryByText('Alexandria')).not.toBeInTheDocument();
  });

  it('shows the email from the JWT, never the Cognito username', () => {
    currentUser = { ...NATIVE_USER, username: 'google_1099384', email: 'jr@example.com' };
    renderPage();
    expect(screen.getByText('jr@example.com')).toBeInTheDocument();
    expect(screen.queryByText('google_1099384')).not.toBeInTheDocument();
  });

  it('explains what the id is for rather than printing a bare hex string', () => {
    renderPage();
    expect(screen.getByText(NATIVE_USER.id)).toBeInTheDocument();
    expect(screen.getByText(/support|administrator/i)).toBeInTheDocument();
  });

  it('copies the id and confirms with a toast', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /copy/i }));

    expect(writeText).toHaveBeenCalledWith(NATIVE_USER.id);
    // A confirmation of something that already worked is exactly what a toast is for.
    const toast = await screen.findByText(/copied/i);
    expect(toast).toHaveAttribute('data-toast');
  });

  it('reports a failed copy in place, never as a toast', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'));
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /copy/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveAttribute('data-toast');
  });

  it('offers the password form to a native reader', () => {
    renderPage();
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
  });

  it('holds the submit until both passwords are usable, and says what is missing', async () => {
    renderPage();
    const submit = screen.getByRole('button', { name: /change password/i });
    expect(submit).toBeDisabled();
    // PlateButton's `reason` — the non-visual half of the outline-fills-to-plate affordance.
    expect(submit).toHaveAccessibleName(/current password/i);

    await userEvent.type(screen.getByLabelText(/current password/i), 'Old-pass-1!');
    await userEvent.type(screen.getByLabelText(/new password/i), 'New-pass-1!');
    expect(screen.getByRole('button', { name: /change password/i })).toBeEnabled();
  });

  it('changes the password and confirms it', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/current password/i), 'Old-pass-1!');
    await userEvent.type(screen.getByLabelText(/new password/i), 'New-pass-1!');
    await userEvent.click(screen.getByRole('button', { name: /change password/i }));

    expect(changePassword).toHaveBeenCalledWith('Old-pass-1!', 'New-pass-1!');
    expect(await screen.findByText(/changed/i)).toHaveAttribute('data-toast');
  });

  it('names the cause when the current password is wrong, in place', async () => {
    changePassword.mockRejectedValueOnce(Object.assign(new Error('nope'), { name: 'NotAuthorizedException' }));
    renderPage();
    await userEvent.type(screen.getByLabelText(/current password/i), 'Wrong-pass-1!');
    await userEvent.type(screen.getByLabelText(/new password/i), 'New-pass-1!');
    await userEvent.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/current password/i);
  });

  it('claims nothing about other sessions', async () => {
    renderPage();
    // Cognito's changePassword does NOT revoke existing refresh tokens — that is GlobalSignOut.
    // Copy asserting otherwise would tell a reader their other devices are secured when they
    // are not.
    expect(document.body.textContent).not.toMatch(/other (device|session)/i);
  });

  it('has no password form at all for a Google sign-in, and says why', () => {
    // The `google_` PREFIX, never an `identities` claim: a native reader who later signed in
    // with Google HAS an identities entry and a password, so gating on it would hide the form
    // from someone who has one. Cognito mints `google_<sub>` only for a user CREATED by the
    // provider, which is precisely the user with no password in the pool.
    currentUser = { ...NATIVE_USER, username: 'google_110992348843' };
    renderPage();

    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /change password/i })).not.toBeInTheDocument();
    expect(screen.getByText(/google/i)).toBeInTheDocument();
  });

  it('offers no account deletion, because the API has no such endpoint', () => {
    renderPage();
    expect(document.body.textContent).not.toMatch(/delete/i);
  });
});
