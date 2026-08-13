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

  const refresh = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      if (!session?.tokens) {
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
      setUser(null);
    }
  }, []);

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
        await cognitoSignIn({ username: email, password });
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
