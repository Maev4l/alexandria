import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Nothing about `@/api` is mocked here — the whole point of this suite is to demonstrate what a
// reader would actually see, through the REAL client (api/client.js), the REAL AuthProvider, and
// the REAL Gate (App.jsx), with only `fetch` intercepted. A suite that mocks the client, as
// App.gate.test.jsx does for its own (different) concern, can prove the mock behaves; it cannot
// prove what ships. `test/setup.js` supplies a valid, approved Cognito session by default, which
// is exactly the reachable-today case: the ID token still says custom:Approved=true for up to 60
// more minutes after an admin revokes it, so the app only learns the truth from a live response.
const App = (await import('./App.jsx')).default;

const jsonResponse = (body, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => body,
});

// THE DEFECT, reproduced exactly as the critique found it, then closed: GET /libraries answered
// with the server's own status word landed on screen next to a control that could never help.
describe('a 403 mid-session, exactly as handlers/middlewares.go sends it', () => {
  it('never shows the server\'s word or a dead retry, and lands on the honest state', async () => {
    window.history.replaceState({}, '', '/libraries');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ message: 'Pending approval' }, { ok: false, status: 403 })),
    );

    render(<App />);

    // The honest destination: the same state a fresh, not-yet-approved sign-in lands on.
    await waitFor(() =>
      expect(screen.getByText(/request is with an administrator/i)).toBeInTheDocument(),
    );

    // Negative assertions — this is the actual requirement, not the heading above. Before the
    // fix, the libraries list rendered a role="alert" box with this same server body, next to a
    // "Try again" that no amount of retrying could satisfy.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
    // The list itself never rendered: its own primary action is absent too.
    expect(screen.queryByRole('button', { name: /new library/i })).toBeNull();

    // The one action that can actually do something is offered instead.
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});

// The general form of the same defect, independent of 403: a 500 carrying an arbitrary message
// must not put that message on screen, and — unlike 403 — the retry it offers must be a real one.
describe('a 500 carrying the server\'s own status word', () => {
  it('never prints it, and offers a retry that can actually succeed', async () => {
    window.history.replaceState({}, '', '/libraries');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ message: 'Unauthorized' }, { ok: false, status: 500 })),
    );

    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/went wrong/i);
    // The exact word the critique's interception produced must not be anywhere on screen.
    expect(screen.queryByText('Unauthorized')).toBeNull();

    const retry = screen.getByRole('button', { name: /try again/i });
    expect(retry).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
