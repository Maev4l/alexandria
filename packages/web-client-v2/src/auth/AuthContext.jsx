// Edited by Claude.
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signIn as cognitoSignIn, signOut as cognitoSignOut, signUp as cognitoSignUp, fetchAuthSession, updatePassword, getCurrentUser } from 'aws-amplify/auth';
import { hideSplash } from '@/lib/splash';

const AuthContext = createContext(null);

// Extract custom:Id from ID token (already normalized: UUID without dashes, uppercase)
const extractUserId = (idToken) =>
  idToken.payload['custom:Id'] || null;

// Extract display name from standard 'name' attribute (may be undefined)
const extractDisplayName = (idToken) =>
  idToken.payload['name'] || null;

// Check if user is approved (custom:Approved attribute)
const extractApproved = (idToken) =>
  idToken.payload['custom:Approved'] === 'true';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for an existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const splashStart = Date.now();
      const MIN_SPLASH_MS = 2000;

      try {
        const session = await fetchAuthSession();
        if (session?.tokens) {
          const currentUser = await getCurrentUser();
          setUser({
            id: extractUserId(session.tokens.idToken),
            token: session.tokens.idToken.toString(),
            username: currentUser.username,
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
        signIn,
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
