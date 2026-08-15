import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
// TEMPORARY. Phase-1 evidence gathering for the session defect; revert this commit to remove it.
import { moduleIdentity, probeUser, sessionShape, snapshot, watchForTokens } from './diagnose.js';

const AuthContext = createContext(null);

// How long to hold the app while a Google code exchange is in flight before giving up and
// showing the sign-in form with a reason. Exported so tests do not have to wait it out.
export const CALLBACK_TIMEOUT_MS = 10_000;

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
  // Non-zero while a sign-in is in progress. A session being established must not be reconciled
  // away by a concurrent read that happens to land in the window before tokens are stored.
  const signInFlight = useRef(0);
  // Serializes refresh() against itself.
  const refreshQueue = useRef(Promise.resolve(false));

  // Amplify v6 has two independent notions of "signed in": fetchAuthSession() asks whether
  // usable tokens exist, getCurrentUser() asks whether a user record exists. They can
  // disagree — a stale record with no tokens — and nothing reconciles them. The UI then
  // renders Login while the SDK still believes someone is authenticated, so signIn() throws
  // UserAlreadyAuthenticatedException at a reader who can do nothing about it.
  //
  // This is a permanent condition, not a one-off: v2 and v3 share an origin and a Cognito
  // client id, so they share Amplify's token store and a stale v2 session surfaces here.
  // This signs the reader OUT, so it is the most destructive thing in a path that reads like a
  // getter — and it reached a real user twice. An empty read is EXACTLY the transient condition
  // we are chasing, so an empty read alone must never destroy a session. Three guards, each
  // ruling out a way of being wrong:
  const discardStaleSession = useCallback(async () => {
    // 1. Never while a sign-in is in flight. The session being reconciled away is the one that
    //    sign-in is in the middle of establishing.
    if (signInFlight.current > 0) return;

    // 2. Only when the state is genuinely INCONSISTENT — a user record with no session behind
    //    it. No record means nothing to reconcile.
    try {
      await getCurrentUser();
    } catch {
      return;
    }

    console.warn('[auth] discarding a user record with no session behind it');
    try {
      await cognitoSignOut();
    } catch {
      // Best effort. The sign-in path reconciles again if this did not take.
    }
  }, []);

  // Returns whether a usable session was found, so callers can distinguish "resolved, signed
  // out" from "resolved, signed in" without reading state that has not committed yet.
  const readSession = useCallback(async () => {
    try {
      let session = await fetchAuthSession();

      // An empty result is EXACTLY the transient condition that cost a real user her session
      // twice, so it is not allowed to drive any decision until it has been confirmed. A forced
      // re-read distinguishes a genuinely absent session from a momentary gap — and this has to
      // happen here rather than only before the sign-out, because an unconfirmed empty read was
      // also enough to blank the signed-in reader via setUser(null). The Cognito session
      // surviving is no comfort to someone looking at a login form.
      if (!session?.tokens) {
        snapshot('auth.readSession EMPTY, confirming', {
          amplify: moduleIdentity(fetchAuthSession),
          ...sessionShape(session),
        });
        probeUser('auth.readSession EMPTY', getCurrentUser);
        session = await fetchAuthSession({ forceRefresh: true }).catch(() => null);
      }

      if (!session?.tokens) {
        await discardStaleSession();
        setUser(null);
        return false;
      }
      // The SUCCESSFUL read — the other half of the comparison. Its timestamp is what the API
      // client's failing read is measured against, and its module id is what that read's id is
      // compared to.
      snapshot('auth.readSession OK', {
        amplify: moduleIdentity(fetchAuthSession),
        ...sessionShape(session),
      });
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
      return true;
    } catch (err) {
      snapshot('auth.readSession THREW', { error: err?.name ?? 'Error' });
      await discardStaleSession();
      setUser(null);
      return false;
    }
  }, [discardStaleSession]);

  // SERIALIZED. refresh() runs concurrently with itself on every sign-in — signIn() awaits it
  // explicitly and the Hub 'signedIn' listener fires another — and two instances could
  // interleave such that one destroyed the session the other had just validated. Queueing them
  // means a later refresh always observes the settled result of the earlier one.
  const refresh = useCallback(() => {
    const next = refreshQueue.current.catch(() => {}).then(() => readSession());
    refreshQueue.current = next;
    return next;
  }, [readSession]);

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

    // A successful Google return cold-loads at /?code=...&state=..., and Amplify's code
    // exchange is still in flight when this mounts. fetchAuthSession then resolves with NO
    // tokens, and resolving on that answer renders the sign-in form to someone who has just
    // signed in successfully — a transient unavailable window presented as a failure.
    //
    // This is not the token gate that was rejected. That would block on a condition we cannot
    // predict; here the URL positively tells us an exchange is underway, so we hold on
    // knowledge rather than on a guess — the same principle as canAct.
    const params = new URLSearchParams(window.location.search);
    const exchangeInFlight = params.has('code') && !params.has('error_description');

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      setIsLoading(false);
    };

    // If the exchange already finished before we mounted, this finds the session and we settle
    // immediately; otherwise we wait for the Hub rather than answering with a wrong 'no'.
    refresh().then((hasSession) => {
      if (hasSession || !exchangeInFlight) settle();
    });

    // A failed exchange must not hold the reader on a spinner forever. Landing on the sign-in
    // form with a stated reason is worse than success and far better than an indefinite wait.
    const timer = exchangeInFlight
      ? setTimeout(() => {
          setOauthMessage({
            type: 'error',
            text: 'Google sign-in did not complete. Try again, or sign in with your email.',
          });
          settle();
        }, CALLBACK_TIMEOUT_MS)
      : null;

    const listener = Hub.listen('auth', ({ payload }) => {
      // tokenRefresh_failure means the 365-day refresh token is gone: the session is over
      // and the reader returns to /login without losing the route they were on.
      if (['signedIn', 'tokenRefresh'].includes(payload.event)) refresh().finally(settle);
      if (['signedOut', 'tokenRefresh_failure'].includes(payload.event)) {
        setUser(null);
        settle();
      }
    });
    return () => {
      listener();
      if (timer) clearTimeout(timer);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      oauthMessage,
      clearOauthMessage: () => setOauthMessage(null),
      signIn: async (email, password) => {
        // Raised across the WHOLE sign-in, including the refresh that establishes the user.
        // Lowering it before that refresh left the exact window unguarded: the session being
        // built is at its most fragile precisely while it is being read for the first time.
        signInFlight.current += 1;
        // Starts the clock on "when do the tokens actually land in storage" — the width of the
        // window, measured rather than inferred. Nothing waits on this.
        snapshot('auth.signIn START', { amplify: moduleIdentity(fetchAuthSession) });
        watchForTokens('auth.signIn');
        try {
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
        } finally {
          signInFlight.current -= 1;
        }
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
