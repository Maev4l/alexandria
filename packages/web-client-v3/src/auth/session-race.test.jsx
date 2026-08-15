import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const amplify = {
  fetchAuthSession: vi.fn(),
  getCurrentUser: vi.fn(),
  signIn: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
  signUp: vi.fn(),
  signInWithRedirect: vi.fn(),
  updatePassword: vi.fn(),
};

let hubListener = null;

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: (...args) => amplify.fetchAuthSession(...args),
  getCurrentUser: (...args) => amplify.getCurrentUser(...args),
  signIn: (...args) => amplify.signIn(...args),
  signOut: (...args) => amplify.signOut(...args),
  signUp: (...args) => amplify.signUp(...args),
  signInWithRedirect: (...args) => amplify.signInWithRedirect(...args),
  updatePassword: (...args) => amplify.updatePassword(...args),
}));

vi.mock('aws-amplify/utils', () => ({
  Hub: {
    listen: (_channel, cb) => {
      hubListener = cb;
      return () => {
        hubListener = null;
      };
    },
  },
}));

const { AuthProvider, useAuth } = await import('./AuthContext.jsx');

const withTokens = {
  tokens: {
    idToken: {
      payload: {
        'custom:Id': 'OWNER1',
        'custom:Approved': 'true',
        email: 'cecile@example.com',
        name: 'Cécile',
      },
      toString: () => 'token',
    },
  },
};

let auth;
const Probe = () => {
  auth = useAuth();
  return null;
};

const renderProvider = () => render(<AuthProvider><Probe /></AuthProvider>);

beforeEach(() => {
  hubListener = null;
  auth = undefined;
  Object.values(amplify).forEach((fn) => fn.mockReset());
  amplify.signIn.mockResolvedValue(undefined);
  amplify.signOut.mockResolvedValue(undefined);
  window.history.replaceState({}, '', '/login');
});

// The console message from Cecile's SECOND occurrence was decisive:
//   [auth] no token after a forced refresh: first=no-tokens, second=no-tokens
// fetchAuthSession SUCCEEDED both times and returned a session with no idToken, so Amplify
// believed there was no session at all — after a sign-in that had just succeeded.
//
// The suspect is our own code. refresh() is not a read: on an empty result it calls
// discardStaleSession(), which SIGNS OUT. And refresh() runs concurrently with itself on every
// sign-in — signIn() awaits it explicitly, and the Hub 'signedIn' listener fires another.
describe('two refreshes racing after a successful sign-in', () => {
  it('reproduces the session being destroyed by a transient empty read', async () => {
    // Signed out at mount: no record, so nothing is discarded.
    amplify.fetchAuthSession.mockResolvedValue({});
    amplify.getCurrentUser.mockRejectedValue(new Error('no current user'));
    renderProvider();
    await waitFor(() => expect(hubListener).not.toBeNull());
    await waitFor(() => expect(auth).toBeDefined());

    // The sign-in succeeds, so from here a user record EXISTS — which is precisely the
    // condition discardStaleSession is guarded on.
    amplify.getCurrentUser.mockResolvedValue({ username: 'cecile@example.com' });
    // A TRANSIENT empty window: one read lands in it, and reads after it see the session
    // again. Modelling it as permanently empty would describe a genuinely destroyed session —
    // which is the condition the sign-out legitimately exists for, tested separately below.
    amplify.fetchAuthSession
      .mockResolvedValueOnce(withTokens) // one refresh sees the real session
      .mockResolvedValueOnce({}) // the other lands in the empty window
      .mockResolvedValue(withTokens); // and it is over

    await Promise.all([
      auth.signIn('cecile@example.com', 'secret'),
      // Amplify emits this when the sign-in completes; the listener fires its own refresh().
      Promise.resolve().then(() => hubListener({ payload: { event: 'signedIn' } })),
    ]);
    // Wait on a meaningful settle point rather than a call count: the number of reads is an
    // implementation detail that changed the moment an empty result had to be confirmed.
    await waitFor(() => expect(auth.user).not.toBeNull());

    // THE DEFECT: a read path signed the reader out, destroying the session the other read had
    // just validated. Every later call — including the API client's forced refresh — then
    // correctly reports no tokens, because by now there genuinely is no session.
    expect(amplify.signOut).not.toHaveBeenCalled();
  });

  it('does not blank the signed-in reader on a transient empty read', async () => {
    // Distinct from the Cognito session surviving: even if nothing is signed out, a stray
    // setUser(null) from the losing read logs the reader out of the UI, which is the same
    // experience for them.
    amplify.fetchAuthSession.mockResolvedValue({});
    amplify.getCurrentUser.mockRejectedValue(new Error('no current user'));
    renderProvider();
    await waitFor(() => expect(hubListener).not.toBeNull());
    await waitFor(() => expect(auth).toBeDefined());

    amplify.getCurrentUser.mockResolvedValue({ username: 'cecile@example.com' });
    amplify.fetchAuthSession
      .mockResolvedValueOnce(withTokens)
      .mockResolvedValueOnce({})
      .mockResolvedValue(withTokens);

    await Promise.all([
      auth.signIn('cecile@example.com', 'secret'),
      Promise.resolve().then(() => hubListener({ payload: { event: 'signedIn' } })),
    ]);

    await waitFor(() => expect(auth.user).not.toBeNull());
    expect(auth.user?.email).toBe('cecile@example.com');
  });

  it('still reconciles a genuinely stale record when no sign-in is in flight', async () => {
    // The original defect this sign-out was ordered for: a user record with no tokens behind
    // it, left over from v2 sharing the token store. That must still be cleaned up.
    amplify.fetchAuthSession.mockResolvedValue({});
    amplify.getCurrentUser.mockResolvedValue({ username: 'jr@example.com' });

    renderProvider();

    await waitFor(() => expect(amplify.signOut).toHaveBeenCalled());
  });
});
