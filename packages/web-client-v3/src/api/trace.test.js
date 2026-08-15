import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAuthSession } from 'aws-amplify/auth';
import { api, registerSessionHooks } from './client.js';

let info;
const res = (status, ok = status < 400) => ({
  ok, status,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => ({}),
});

beforeEach(() => {
  info = vi.spyOn(console, 'info').mockImplementation(() => {});
  // REQUIRED: vi.spyOn on an already-spied method returns the same spy, so without this the
  // calls accumulate across tests and every count below measures the whole file.
  info.mockClear();
  vi.mocked(fetchAuthSession).mockResolvedValue({ tokens: { idToken: { toString: () => 't' } } });
  registerSessionHooks({ refresh: async () => {}, invalidate: () => {} });
});

const linesFor = (event) =>
  info.mock.calls.filter(([first]) => first === `[api] ${event}`);

describe('the request trace', () => {
  it('announces a request before it is sent, so silence means it never happened', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(200)));
    await api.get('/libraries');
    expect(linesFor('start')).toHaveLength(1);
    expect(linesFor('outcome')[0][1]).toMatchObject({ status: 200, ok: true });
  });

  it('traces a 401 outcome too, which is the status most worth tracing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(401, false)));
    await expect(api.get('/libraries')).rejects.toThrow();
    // Two attempts: the original and the post-refresh retry, both fully traced.
    expect(linesFor('start')).toHaveLength(2);
    expect(linesFor('outcome')).toHaveLength(2);
  });

  it('never puts a token in the log', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(200)));
    await api.get('/libraries');
    expect(JSON.stringify(info.mock.calls)).not.toContain('"t"');
  });
});
