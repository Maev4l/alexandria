import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// A valid Cognito session is the NORMAL condition, so it is the default here. Tests about the
// abnormal conditions — no tokens, fetchAuthSession throwing — mock this module themselves,
// which takes precedence per file.
//
// This became necessary the moment the API client stopped sending unauthenticated requests: it
// now refuses to fire without a token, which is the whole point of the fix, so a test with no
// session makes no request at all rather than an unauthenticated one.
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(async () => ({
    tokens: {
      idToken: {
        payload: {
          'custom:Id': 'OWNER1',
          'custom:Approved': 'true',
          email: 'jr@example.com',
          name: 'JR Sue',
        },
        toString: () => 'test-token',
      },
    },
  })),
  getCurrentUser: vi.fn(async () => ({ username: 'jr@example.com' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  signInWithRedirect: vi.fn(),
  updatePassword: vi.fn(),
}));

vi.mock('aws-amplify/utils', () => ({ Hub: { listen: () => () => {} } }));

afterEach(() => {
  cleanup();
});
