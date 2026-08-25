import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const amplify = {
  fetchAuthSession: vi.fn(),
  getCurrentUser: vi.fn(async () => ({ username: 'jr@example.com' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  signInWithRedirect: vi.fn(),
  updatePassword: vi.fn(),
};

// Captured so the test can fire the event Amplify emits when the code exchange completes.
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

const { AuthProvider, useAuth, CALLBACK_TIMEOUT_MS } = await import('./AuthContext.jsx');

const withTokens = {
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

// Mirrors what App.jsx's Gate actually does, so the test observes the screen a reader would see
// rather than the provider's internals.
const Gate = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p>resolving</p>;
  return <p>{user ? 'app' : 'the sign-in form'}</p>;
};

const Message = () => {
  const { oauthMessage } = useAuth();
  return <p>{oauthMessage?.text ?? 'no message'}</p>;
};

const renderReturn = () =>
  render(
    <AuthProvider>
      <Gate />
    </AuthProvider>,
  );

beforeEach(() => {
  hubListener = null;
  amplify.fetchAuthSession.mockReset();
  // A successful Google return lands here: the authorization code is still in the URL and
  // Amplify's exchange is in flight.
  window.history.replaceState({}, '', '/?code=auth-code-123&state=xyz');
});

describe('returning from a Google redirect', () => {
  it('does not flash the sign-in form while the code exchange is still in flight', async () => {
    // The exchange has not completed, so the first read has no tokens yet.
    amplify.fetchAuthSession.mockResolvedValue({});

    renderReturn();

    // Give the provider every chance to settle into a wrong answer.
    await new Promise((resolve) => setTimeout(resolve, 50));

    // A reader who has just signed in successfully must never be shown the sign-in form.
    expect(screen.queryByText('the sign-in form')).toBeNull();
  });

  it('shows the app once the exchange completes', async () => {
    amplify.fetchAuthSession.mockResolvedValue({});
    renderReturn();

    // Wait for the provider's effect to register the Hub listener. Firing the event before
    // effects flush made this a no-op and looked like a product failure.
    await waitFor(() => expect(hubListener).not.toBeNull());

    amplify.fetchAuthSession.mockResolvedValue(withTokens);
    hubListener({ payload: { event: 'signedIn' } });

    await waitFor(() => expect(screen.getByText('app')).toBeInTheDocument());
  });

  it('gives up on a stalled exchange rather than holding forever', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      amplify.fetchAuthSession.mockResolvedValue({});
      renderReturn();
      await waitFor(() => expect(screen.getByText('resolving')).toBeInTheDocument());

      // No Hub event ever arrives — the exchange failed silently.
      await vi.advanceTimersByTimeAsync(CALLBACK_TIMEOUT_MS + 100);

      // Landing on the sign-in form with a reason beats an indefinite spinner.
      await waitFor(() => expect(screen.getByText('the sign-in form')).toBeInTheDocument());
    } finally {
      vi.useRealTimers();
    }
  });

  it('states why, rather than presenting a bare form after a failed exchange', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      amplify.fetchAuthSession.mockResolvedValue({});
      render(
        <AuthProvider>
          <Message />
        </AuthProvider>,
      );
      await vi.advanceTimersByTimeAsync(CALLBACK_TIMEOUT_MS + 100);
      await waitFor(() =>
        expect(screen.getByText(/google sign-in did not complete/i)).toBeInTheDocument(),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not hold at all when there is no code in the URL', async () => {
    window.history.replaceState({}, '', '/libraries');
    amplify.fetchAuthSession.mockResolvedValue({});

    renderReturn();

    // An ordinary cold load with no session must reach the sign-in form immediately.
    await waitFor(() => expect(screen.getByText('the sign-in form')).toBeInTheDocument());
  });
});
