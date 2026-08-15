import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchAuthSession,
  getCurrentUser,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  signUp as cognitoSignUp,
  signInWithRedirect,
  updatePassword,
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { config } from '@/config';
import { registerSessionHooks } from '@/api';
import { classifyOAuthCallback } from './oauth.js';

const AuthContext = createContext(null);

const initialsOf = (displayName, email) => {
  const source = displayName || email || '';
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return `${parts[0]?.[0] ?? '?'}${parts[1]?.[0] ?? ''}`.toUpperCase();
};

// Mock mode signs in a fixed, approved reader so every screen is reachable without Cognito.
const MOCK_USER = {
  id: 'OWNER1',
  email: 'jr@example.com',
  displayName: 'JR Sue',
  username: 'jr@example.com',
  approved: true,
  initials: 'JR',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(config.isMock ? MOCK_USER : null);
  const [isLoading, setIsLoading] = useState(!config.isMock);
  const [oauthMessage, setOauthMessage] = useState(null);

  // Amplify v6 has two independent notions of "signed in": fetchAuthSession() asks whether
  // usable tokens exist, getCurrentUser() asks whether a user record exists. They can
  // disagree — a stale record with no tokens — and nothing reconciles them. The UI then
  // renders Login while the SDK still believes someone is authenticated, so signIn() throws
  // UserAlreadyAuthenticatedException at a reader who can do nothing about it.
  //
  // This is a permanent condition, not a one-off: v2 and v3 share an origin and a Cognito
  // client id, so they share Amplify's token store and a stale v2 session surfaces here.
  const discardStaleSession = useCallback(async () => {
    try {
      await getCurrentUser();
    } catch {
      // No user record either — already consistent, nothing to discard.
      return;
    }
    try {
      // Resolve the disagreement in favour of what the UI is about to claim anyway.
      await cognitoSignOut();
    } catch {
      // Best effort. The sign-in path reconciles again if this did not take.
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      if (!session?.tokens) {
        await discardStaleSession();
        setUser(null);
        return;
      }
      const claims = session.tokens.idToken.payload;
      const current = await getCurrentUser();
      const displayName = claims.name ?? null;
      const email = claims.email ?? null;
      setUser({
        // custom:Id is the owner id used throughout the API and in support requests.
        id: claims['custom:Id'] ?? null,
        email,
        displayName,
        username: current.username,
        approved: claims['custom:Approved'] === 'true',
        initials: initialsOf(displayName, email),
      });
    } catch {
      await discardStaleSession();
      setUser(null);
    }
  }, [discardStaleSession]);

  // The API client cannot navigate and must not reach into React state, so it delegates
  // recovery here: force Amplify to re-resolve the session, or drop the user, which the router
  // turns into a return to /login with the current route preserved.
  useEffect(() => {
    registerSessionHooks({
      refresh: async () => {
        try {
          await fetchAuthSession({ forceRefresh: true });
        } catch {
          // Nothing more to try; the caller decides what a still-missing token means.
        }
        await refresh();
      },
      invalidate: () => setUser(null),
    });
  }, [refresh]);

  useEffect(() => {
    if (config.isMock) return undefined;

    const callback = classifyOAuthCallback(window.location.search);
    if (callback) {
      window.history.replaceState({}, '', window.location.pathname);
      setOauthMessage(
        callback.type === 'linked'
          ? {
              type: 'success',
              text: 'Your Google account is linked. Sign in once more to continue.',
            }
          : { type: 'error', text: callback.message },
      );
    }

    refresh().finally(() => setIsLoading(false));

    const listener = Hub.listen('auth', ({ payload }) => {
      // tokenRefresh_failure means the 365-day refresh token is gone: the session is over
      // and the reader returns to /login without losing the route they were on.
      if (['signedIn', 'tokenRefresh'].includes(payload.event)) refresh();
      if (['signedOut', 'tokenRefresh_failure'].includes(payload.event)) setUser(null);
    });
    return () => listener();
  }, [refresh]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      oauthMessage,
      clearOauthMessage: () => setOauthMessage(null),
      signIn: async (email, password) => {
        try {
          await cognitoSignIn({ username: email, password });
        } catch (err) {
          if (err?.name !== 'UserAlreadyAuthenticatedException') throw err;
          // "There is already a signed in user" is an SDK statement about SDK state; it
          // tells someone staring at a login form nothing they can act on. Resolve it
          // instead of reporting it.
          //
          // Always sign out and retry with the credentials that were actually typed, even
          // when the existing session is usable: adopting it would sign the reader into
          // whichever account the stale session belongs to, which may not be theirs.
          await cognitoSignOut().catch(() => {});
          await cognitoSignIn({ username: email, password });
        }
        await refresh();
      },
      signInWithGoogle: () => signInWithRedirect({ provider: 'Google' }),
      signUp: (email, password, name) =>
        cognitoSignUp({ username: email, password, options: { userAttributes: { email, name } } }),
      signOut: async () => {
        await cognitoSignOut();
        setUser(null);
      },
      changePassword: (oldPassword, newPassword) => updatePassword({ oldPassword, newPassword }),
    }),
    [user, isLoading, oauthMessage, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside an AuthProvider');
  return value;
};
