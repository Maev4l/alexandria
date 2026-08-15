import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { api, registerSessionHooks } from './client.js';

// TEMPORARY, ships and reverts with the diagnostic commit.
//
// An instrument that changes the window it measures is not evidence. probeUser sits directly
// between the failing first read and the forced refresh, so if it were awaited it would push the
// retry later in wall-clock time — and if the condition is time-dependent, the retry would start
// succeeding and read as a repair. This asserts the caller's timing is untouched.
const SLOW_MS = 300;

beforeEach(() => {
  vi.mocked(fetchAuthSession).mockReset();
  vi.mocked(getCurrentUser).mockReset();
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({ ok: true }),
  })));
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

describe('the diagnostic probe', () => {
  it('does not delay the forced refresh that follows a failing read', async () => {
    vi.mocked(getCurrentUser).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ username: 'x' }), SLOW_MS)),
    );
    vi.mocked(fetchAuthSession)
      .mockResolvedValueOnce({})
      .mockResolvedValue({ tokens: { idToken: { toString: () => 't' } } });

    let refreshedAt = null;
    registerSessionHooks({ refresh: async () => { refreshedAt = performance.now(); }, invalidate: () => {} });

    const startedAt = performance.now();
    await api.get('/libraries');

    // The refresh must happen at once, not after the probe resolves.
    expect(refreshedAt - startedAt).toBeLessThan(SLOW_MS / 2);
  });
});
