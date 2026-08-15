import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAuthSession } from 'aws-amplify/auth';

// TEMPORARY, ships and reverts with the diagnostic commits.
//
// The question asked directly: CAN the client-side probe fire at all? A failing run produced
// AuthContext's diag lines and none of the client's, and "the paste is partial" is the
// comfortable answer rather than a verified one. This imports client.js FIRST, ahead of any
// auth module, so if module-init order could disable it this is where that shows.
let info;

beforeEach(() => {
  vi.resetModules();
  info = vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true, status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({}),
  })));
});

const linesMatching = (needle) =>
  info.mock.calls.filter(([first]) => typeof first === 'string' && first.includes(needle));

describe('the client-side probe', () => {
  it('fires from client.js when a read returns no token', async () => {
    const { api, registerSessionHooks } = await import('./client.js');
    registerSessionHooks({ refresh: async () => {}, invalidate: () => {} });
    vi.mocked(fetchAuthSession).mockResolvedValue({});

    await expect(api.get('/libraries')).rejects.toThrow();

    expect(linesMatching('client.readToken(first) NO TOKEN')).toHaveLength(1);
    expect(linesMatching('client.readToken(after-forced-refresh) NO TOKEN')).toHaveLength(1);
  });

  it('fires when fetchAuthSession throws, not only when it returns empty', async () => {
    const { api, registerSessionHooks } = await import('./client.js');
    registerSessionHooks({ refresh: async () => {}, invalidate: () => {} });
    vi.mocked(fetchAuthSession).mockRejectedValue(new Error('boom'));

    await expect(api.get('/libraries')).rejects.toThrow();
    expect(linesMatching('THREW').length).toBeGreaterThan(0);
  });
});
