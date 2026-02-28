// Edited by Claude.
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signIn as cognitoSignIn, signOut as cognitoSignOut, signUp as cognitoSignUp, signInWithRedirect, fetchAuthSession, updatePassword, getCurrentUser } from 'aws-amplify/auth';
import { hideSplash } from '@/lib/splash';

const AuthContext = createContext(null);

// Check URL for OAuth errors (returned after redirect)
// Returns: { type: 'linked' | 'error', message?: string }
const checkOAuthError = () => {
  const params = new URLSearchParams(window.location.search);
  const errorDesc = params.get('error_description');

  if (errorDesc) {
    // Clean up URL
    window.history.replaceState({}, '', window.location.pathname);

    // Check if this is the "linked to existing account" message (success case)
    if (errorDesc.toLowerCase().includes('linked')) {
      return { type: 'linked' };
    }

    // Check for "user already exists" (native signup when federated exists)
    if (errorDesc.toLowerCase().includes('user already exists')) {
      return { type: 'error', message: 'An account with this email already exists.' };
    }

    // Other errors
    return { type: 'error', message: errorDesc };
  }
  return null;
};

// Extract custom:Id from ID token (already normalized: UUID without dashes, uppercase)
const extractUserId = (idToken) =>
  idToken.payload['custom:Id'] || null;

// Extract email from ID token
const extractEmail = (idToken) =>
  idToken.payload['email'] || null;

// Extract display name from standard 'name' attribute (may be undefined)
const extractDisplayName = (idToken) =>
  idToken.payload['name'] || null;

// Check if user is approved (custom:Approved attribute)
const extractApproved = (idToken) =>
  idToken.payload['custom:Approved'] === 'true';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [oauthMessage, setOauthMessage] = useState(null); // { type: 'success' | 'error', text: string }

  // Check for an existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const splashStart = Date.now();
      const MIN_SPLASH_MS = 2000;

      // Check for OAuth callback errors (e.g., account linking)
      const oauthResult = checkOAuthError();
      if (oauthResult?.type === 'linked') {
        setOauthMessage({
          type: 'success',
          text: 'Your Google account has been linked. Please sign in again.',
        });
      } else if (oauthResult?.type === 'error') {
        setOauthMessage({
          type: 'error',
          text: oauthResult.message,
        });
      }

      try {
        const session = await fetchAuthSession();
        if (session?.tokens) {
          const currentUser = await getCurrentUser();
          setUser({
            id: extractUserId(session.tokens.idToken),
            token: session.tokens.idToken.toString(),
            username: currentUser.username,
            email: extractEmail(session.tokens.idToken),
            displayName: extractDisplayName(session.tokens.idToken),
            approved: extractApproved(session.tokens.idToken),
          });
        }
      } catch {
        // No active session — stay unauthenticated
      } finally {
        // Ensure splash is shown for at least 2 seconds
        const elapsed = Date.now() - splashStart;
        const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
        setTimeout(() => {
          setIsLoading(false);
          hideSplash();
        }, remaining);
      }
    };
    checkSession();
  }, []);

  // Clear the OAuth message
  const clearOauthMessage = useCallback(() => {
    setOauthMessage(null);
  }, []);

  const signIn = useCallback(async (username, password) => {
    try {
      await cognitoSignIn({ username, password });
    } catch (err) {
      // Already logged in — proceed to fetch current session
      if (err.name !== 'UserAlreadyAuthenticatedException') throw err;
    }
    const session = await fetchAuthSession();
    const currentUser = await getCurrentUser();
    setUser({
      id: extractUserId(session.tokens.idToken),
      token: session.tokens.idToken.toString(),
      username: currentUser.username,
      email: extractEmail(session.tokens.idToken),
      displayName: extractDisplayName(session.tokens.idToken),
      approved: extractApproved(session.tokens.idToken),
    });
  }, []);

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    await updatePassword({ oldPassword, newPassword });
  }, []);

  // Sign up new user - returns without setting user state (pending admin approval)
  const signUp = useCallback(async (email, password, displayName) => {
    const userAttributes = {};
    if (displayName) {
      // Use standard 'name' attribute instead of custom:DisplayName
      userAttributes['name'] = displayName;
    }
    await cognitoSignUp({
      username: email,
      password,
      options: {
        userAttributes,
      },
    });
  }, []);

  // Sign in with Google OAuth
  const signInWithGoogle = useCallback(async () => {
    await signInWithRedirect({ provider: 'Google' });
  }, []);

  const signOut = useCallback(async () => {
    await cognitoSignOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        oauthMessage,
        clearOauthMessage,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
