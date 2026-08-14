import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const amplify = {
  fetchAuthSession: vi.fn(),
  getCurrentUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  signInWithRedirect: vi.fn(),
  updatePassword: vi.fn(),
};

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: (...args) => amplify.fetchAuthSession(...args),
  getCurrentUser: (...args) => amplify.getCurrentUser(...args),
  signIn: (...args) => amplify.signIn(...args),
  signOut: (...args) => amplify.signOut(...args),
  signUp: (...args) => amplify.signUp(...args),
  signInWithRedirect: (...args) => amplify.signInWithRedirect(...args),
  updatePassword: (...args) => amplify.updatePassword(...args),
}));

vi.mock('aws-amplify/utils', () => ({ Hub: { listen: () => () => {} } }));

const { AuthProvider, useAuth } = await import('./AuthContext.jsx');

const Probe = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p>loading</p>;
  return <p>{user ? `signed in as ${user.email}` : 'signed out'}</p>;
};

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

const validSession = {
  tokens: {
    idToken: {
      payload: {
        'custom:Id': 'OWNER1',
        'custom:Approved': 'true',
        email: 'jr@example.com',
        name: 'JR Sue',
      },
      toString: () => 'token',
    },
  },
};

beforeEach(() => {
  Object.values(amplify).forEach((fn) => fn.mockReset());
  amplify.signOut.mockResolvedValue(undefined);
  amplify.signIn.mockResolvedValue(undefined);
});

describe('AuthContext session reconciliation', () => {
  // The state that actually reached the user: Amplify holds a user record but no usable
  // tokens, so the UI renders Login while the SDK still believes someone is signed in.
  it('discards a user record that has no tokens behind it', async () => {
    amplify.fetchAuthSession.mockResolvedValue({});
    amplify.getCurrentUser.mockResolvedValue({ username: 'jr@example.com' });

    renderProvider();

    await waitFor(() => expect(screen.getByText('signed out')).toBeInTheDocument());
    // Reconciled to the state the UI is about to claim, rather than left disagreeing.
    expect(amplify.signOut).toHaveBeenCalledOnce();
  });

  it('does not sign out when there is genuinely no session at all', async () => {
    amplify.fetchAuthSession.mockResolvedValue({});
    amplify.getCurrentUser.mockRejectedValue(new Error('no current user'));

    renderProvider();

    await waitFor(() => expect(screen.getByText('signed out')).toBeInTheDocument());
    expect(amplify.signOut).not.toHaveBeenCalled();
  });

  it('reconciles when fetchAuthSession throws outright', async () => {
    amplify.fetchAuthSession.mockRejectedValue(new Error('storage unavailable'));
    amplify.getCurrentUser.mockResolvedValue({ username: 'jr@example.com' });

    renderProvider();

    await waitFor(() => expect(screen.getByText('signed out')).toBeInTheDocument());
    expect(amplify.signOut).toHaveBeenCalledOnce();
  });

  it('adopts a real session', async () => {
    amplify.fetchAuthSession.mockResolvedValue(validSession);
    amplify.getCurrentUser.mockResolvedValue({ username: 'jr@example.com' });

    renderProvider();

    await waitFor(() =>
      expect(screen.getByText('signed in as jr@example.com')).toBeInTheDocument(),
    );
    expect(amplify.signOut).not.toHaveBeenCalled();
  });
});

describe('signing in over a stale session', () => {
  const alreadyAuthenticated = Object.assign(new Error('There is already a signed in user.'), {
    name: 'UserAlreadyAuthenticatedException',
  });

  const signInThroughProvider = async () => {
    let auth;
    const Capture = () => {
      auth = useAuth();
      return null;
    };
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>,
    );
    await waitFor(() => expect(auth).toBeDefined());
    await auth.signIn('jr@example.com', 'Secret1!');
  };

  it('resolves UserAlreadyAuthenticatedException instead of surfacing it', async () => {
    amplify.fetchAuthSession.mockResolvedValue(validSession);
    amplify.getCurrentUser.mockResolvedValue({ username: 'jr@example.com' });
    amplify.signIn.mockRejectedValueOnce(alreadyAuthenticated).mockResolvedValueOnce(undefined);

    // The reader must never see those words: they describe SDK state and offer no action.
    await expect(signInThroughProvider()).resolves.not.toThrow();

    expect(amplify.signOut).toHaveBeenCalledOnce();
    expect(amplify.signIn).toHaveBeenCalledTimes(2);
  });

  it('signs in with the credentials that were typed, not the session that was there', async () => {
    amplify.fetchAuthSession.mockResolvedValue(validSession);
    amplify.getCurrentUser.mockResolvedValue({ username: 'someone-else@example.com' });
    amplify.signIn.mockRejectedValueOnce(alreadyAuthenticated).mockResolvedValueOnce(undefined);

    await signInThroughProvider();

    // Adopting the existing session would sign the reader into whichever account it belongs
    // to, which may not be theirs.
    expect(amplify.signIn).toHaveBeenLastCalledWith({
      username: 'jr@example.com',
      password: 'Secret1!',
    });
  });

  it('still reports a real credential failure', async () => {
    amplify.fetchAuthSession.mockResolvedValue({});
    amplify.getCurrentUser.mockRejectedValue(new Error('no current user'));
    amplify.signIn.mockRejectedValue(
      Object.assign(new Error('Incorrect username or password.'), {
        name: 'NotAuthorizedException',
      }),
    );

    await expect(signInThroughProvider()).rejects.toMatchObject({
      name: 'NotAuthorizedException',
    });
  });
});
