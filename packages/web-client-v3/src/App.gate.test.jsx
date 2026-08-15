import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { librariesApi } from '@/api';

vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, librariesApi: { list: vi.fn(async () => ({ libraries: [] })) } };
});

let hubListener = null;
vi.mock('aws-amplify/utils', () => ({
  Hub: {
    listen: (_channel, cb) => {
      hubListener = cb;
      return () => { hubListener = null; };
    },
  },
}));

const App = (await import('./App.jsx')).default;

const sessionFor = (id, email) => ({
  tokens: {
    idToken: {
      payload: { 'custom:Id': id, 'custom:Approved': 'true', email, name: email },
      toString: () => `token-${id}`,
    },
  },
});

const signedOut = () => {
  vi.mocked(fetchAuthSession).mockResolvedValue({});
  vi.mocked(getCurrentUser).mockRejectedValue(new Error('UserUnAuthenticated'));
};

beforeEach(() => {
  hubListener = null;
  vi.mocked(librariesApi.list).mockClear();
  vi.mocked(librariesApi.list).mockResolvedValue({ libraries: [] });
  window.history.replaceState({}, '', '/libraries');
});

// THE DEFECT, found by the request-lifecycle instrumentation and not by any hypothesis:
// a second reader's very first page load fired GET /libraries at t+19ms — FIFTEEN SECONDS before
// she signed in. There was no token because there was no session. The resulting error was stored
// in LibrariesProvider, which sits ABOVE the router, so it was still on screen after she signed
// in and reached /libraries. She was shown a failure caused by the app asking for her libraries
// before she had an identity.
describe('a page load while signed out', () => {
  it('does not fetch libraries', async () => {
    signedOut();

    render(<App />);

    // Wait for the auth gate to resolve rather than sampling an arbitrary instant.
    await waitFor(() => expect(screen.queryByRole('status', { busy: true })).toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(librariesApi.list).not.toHaveBeenCalled();
  });
});

// The second defect, and the one that made the first one VISIBLE. Even once the signed-out fetch
// is gone, state raised under one identity must never still be on screen under another — the
// provider sits above the router, so nothing about navigating clears it. Fixing only the fetch
// would leave this class of defect intact for the next provider mounted up there.
describe('a change of identity', () => {
  it('does not carry one reader\'s error into another reader\'s session', async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue(sessionFor('OWNER1', 'jr@example.com'));
    vi.mocked(getCurrentUser).mockResolvedValue({ username: 'jr@example.com' });
    vi.mocked(librariesApi.list).mockRejectedValue(new Error('Your session is not ready.'));

    render(<App />);
    await waitFor(() => expect(screen.getByText(/session is not ready/i)).toBeInTheDocument());

    // A different reader signs in on the same page — the provider must not still be holding the
    // first reader's failure.
    vi.mocked(librariesApi.list).mockResolvedValue({ libraries: [] });
    vi.mocked(fetchAuthSession).mockResolvedValue(sessionFor('OWNER2', 'cecile@example.com'));
    vi.mocked(getCurrentUser).mockResolvedValue({ username: 'cecile@example.com' });
    await waitFor(() => expect(hubListener).not.toBeNull());
    hubListener({ payload: { event: 'signedIn' } });

    await waitFor(() => expect(screen.queryByText(/session is not ready/i)).toBeNull());
  });
});
