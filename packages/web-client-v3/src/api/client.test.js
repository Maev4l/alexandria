import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  api,
  ApiError,
  registerSessionHooks,
  SessionExpiredError,
  SessionUnavailableError,
} from './client.js';

const withToken = {
  tokens: { idToken: { toString: () => 'test-token' } },
};

const jsonResponse = (body, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => body,
});

let refresh;
let invalidate;

beforeEach(() => {
  refresh = vi.fn(async () => {});
  invalidate = vi.fn();
  registerSessionHooks({ refresh, invalidate });
  vi.mocked(fetchAuthSession).mockReset();
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ libraries: [] })));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// The state that reached a real user: a second reader signed in, was shown
// "Unauthorized — try again", clicked Try again, and everything worked. The request had been
// sent with NO Authorization header, API Gateway answered 401, and a session-timing problem was
// presented as a permissions verdict. Neither branch below had ever been tested.
describe('a request that cannot be authenticated', () => {
  it('never reaches the network when fetchAuthSession throws', async () => {
    vi.mocked(fetchAuthSession).mockRejectedValue(new Error('network down'));

    await expect(api.get('/libraries')).rejects.toBeInstanceOf(SessionUnavailableError);
    // The critical assertion. Previously this fired unauthenticated and collected a 401.
    expect(fetch).not.toHaveBeenCalled();
  });

  it('never reaches the network when the session resolves without tokens', async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue({});

    await expect(api.get('/libraries')).rejects.toBeInstanceOf(SessionUnavailableError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('records WHICH of the two silent paths was taken', async () => {
    // The old code discarded this, so when it happened for real there was no way to tell
    // whether the call threw or simply returned nothing.
    vi.mocked(fetchAuthSession).mockRejectedValue(new Error('network down'));
    await expect(api.get('/libraries')).rejects.toMatchObject({ reason: 'threw' });

    vi.mocked(fetchAuthSession).mockResolvedValue({});
    await expect(api.get('/libraries')).rejects.toMatchObject({ reason: 'no-tokens' });
  });

  it('preserves the underlying cause rather than swallowing it', async () => {
    const cause = new Error('NotAuthorizedException');
    vi.mocked(fetchAuthSession).mockRejectedValue(cause);
    await expect(api.get('/libraries')).rejects.toMatchObject({ cause });
  });

  it('carries a session message, not a server one', async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue({});
    await expect(api.get('/libraries')).rejects.toThrow(/session is not ready/i);
  });

  it('recovers silently when a forced refresh produces the token', async () => {
    // Exactly Cecile's case: absent on the first attempt, present on the retry. The recovery
    // she performed by hand now happens before anything is shown.
    vi.mocked(fetchAuthSession).mockResolvedValueOnce({}).mockResolvedValue(withToken);

    await expect(api.get('/libraries')).resolves.toEqual({ libraries: [] });
    expect(refresh).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledOnce();
  });
});

describe('a 401 on a request that DID carry a token', () => {
  beforeEach(() => vi.mocked(fetchAuthSession).mockResolvedValue(withToken));

  it('is treated as a session event: one forced refresh, then one retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, { ok: false, status: 401 }))
        .mockResolvedValueOnce(jsonResponse({ libraries: [] })),
    );

    await expect(api.get('/libraries')).resolves.toEqual({ libraries: [] });
    expect(refresh).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('ends the session rather than showing a raw Unauthorized when the retry also fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ message: 'Unauthorized' }, { ok: false, status: 401 })),
    );

    await expect(api.get('/libraries')).rejects.toBeInstanceOf(SessionExpiredError);
    // Dropping the user is what returns the reader to /login with their route preserved.
    expect(invalidate).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry forever', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ message: 'Unauthorized' }, { ok: false, status: 401 })),
    );
    await expect(api.get('/libraries')).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('ordinary failures are unchanged', () => {
  beforeEach(() => vi.mocked(fetchAuthSession).mockResolvedValue(withToken));

  it('still surfaces a server error as an ApiError with its status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ message: 'Not found' }, { ok: false, status: 404 })),
    );
    await expect(api.get('/libraries/x')).rejects.toBeInstanceOf(ApiError);
    await expect(api.get('/libraries/x')).rejects.toMatchObject({ status: 404 });
  });

  it('sends the token it obtained', async () => {
    await api.get('/libraries');
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/libraries',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });
});
