import fs from 'fs';
import path from 'path';
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

  // Sharing is by email — `POST /libraries/{libraryId}/share` takes an address — so what the
  // reader copies is the thing they give to someone who wants to share a library WITH them.
  // The `custom:Id` this screen used to print answered no question a reader has: the admin is the
  // owner, `users list` prints ids, and there is no support channel to quote one to.
  it('offers the email for copying, and says what it is for', () => {
    renderPage();
    expect(screen.getByText('jr@example.com')).toBeInTheDocument();
    expect(screen.getByText(/share a library with you/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy your email address/i })).toBeInTheDocument();
  });

  it('never shows the internal account id', () => {
    renderPage();
    // Asserted as an ABSENCE, because the positive case cannot detect a leftover: the screen
    // would look correct with the id still on it.
    expect(screen.queryByText(/4C1B7E90/i)).toBeNull();
    expect(screen.queryByText(/user id/i)).toBeNull();
  });

  it('copies the email and confirms with a toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /copy your email address/i }));
    expect(writeText).toHaveBeenCalledWith('jr@example.com');
    expect(await screen.findByText(/email address is copied/i)).toBeInTheDocument();
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

// The Settings row's note describes THIS screen, and `be19ecc` removed the id from here without
// touching that file — so no diff-driven review could see the description go stale. Asserted
// against both, in one test, so they cannot drift apart again: the note is read out of
// Settings.jsx's source and every noun in it has to be true of the destination.
describe('the Settings row describes what Account actually shows', () => {
  const noteFromSettings = () => {
    // A plain path from cwd: `import.meta.url` is not a file URL under this runner.
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/Settings.jsx'), 'utf8');
    return /to="\/settings\/account"[^>]*note="([^"]+)"/.exec(source)?.[1];
  };

  it('promises nothing the screen does not offer, on either branch', () => {
    const note = noteFromSettings();
    expect(note).toBeTruthy();
    // The id is gone from Account, and a Google reader has no password either — so neither word
    // may appear in a note that has to be true of both branches.
    expect(note.toLowerCase()).not.toContain('id');
    expect(note.toLowerCase()).not.toContain('password');
  });

  it('names something the screen really shows', () => {
    // The other direction: a note that promises nothing would also pass the test above.
    expect(noteFromSettings().toLowerCase()).toContain('email');
    renderPage();
    expect(screen.getByText('jr@example.com')).toBeInTheDocument();
  });
});

