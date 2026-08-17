import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  api,
  ApiError,
  PendingApprovalError,
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
let pendingApproval;

beforeEach(() => {
  refresh = vi.fn(async () => {});
  invalidate = vi.fn();
  pendingApproval = vi.fn();
  registerSessionHooks({ refresh, invalidate, pendingApproval });
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

// THE DEFECT ITSELF: intercepting GET /libraries with a 500 carrying {"message":"Unauthorized"}
// printed "Unauthorized" on screen, because ApiError.message WAS data?.message. This section
// asserts the negative directly against the real client — that a reader-facing slot never shows
// a status word or the server's own text — for every status the app can actually hit, per
// openapi.yaml and handlers/collections.go (400 validation, 404 item, 409 duplicate collection
// name, 5xx). A test that only checked ApiError.message in isolation could not catch a call site
// that concatenates or otherwise mishandles it; this checks the same string the DOM would show.
describe('a status maps to app-authored copy, never the server\'s own words', () => {
  beforeEach(() => vi.mocked(fetchAuthSession).mockResolvedValue(withToken));

  const cases = [
    [400, 'invalid request - name too long (max. 100 chars)', /not accepted/i],
    [404, 'item not found', /could not be found/i],
    [409, 'collection with this name already exists', /already used/i],
    [500, 'Unauthorized', /went wrong/i],
    [502, 'Unauthorized', /went wrong/i],
  ];

  for (const [status, serverMessage, expectedCopy] of cases) {
    it(`status ${status}: server said "${serverMessage}"`, async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => jsonResponse({ message: serverMessage }, { ok: false, status })),
      );

      const err = await api.get('/x').catch((thrown) => thrown);
      expect(err).toBeInstanceOf(ApiError);
      // The negative assertion the critique's own reproduction depends on.
      expect(err.message).not.toBe(serverMessage);
      expect(err.message).not.toContain(serverMessage);
      expect(err.message).toMatch(expectedCopy);

      // Not lost — kept on the error object for a remote diagnosis (e.g. `err.data.message` in
      // a captured console/error report), just never in the string a reader's slot renders.
      expect(err.data).toEqual({ message: serverMessage });
    });
  }

  it('logs the server\'s exact words to the console trace, for the diagnosis that replaces rendering them', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ message: 'Unauthorized' }, { ok: false, status: 500 })),
    );

    await api.get('/x').catch(() => {});

    expect(info).toHaveBeenCalledWith(
      '[api] error-detail',
      expect.objectContaining({ status: 500, serverMessage: 'Unauthorized' }),
    );
  });
});

describe('a network failure with no status', () => {
  beforeEach(() => vi.mocked(fetchAuthSession).mockResolvedValue(withToken));

  it('never surfaces the browser\'s own wording', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    const err = await api.get('/libraries').catch((thrown) => thrown);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBeNull();
    expect(err.message).not.toMatch(/failed to fetch/i);
    expect(err.message).toMatch(/could not reach the server/i);
  });
});

// One case is reachable today, per .claude/ui-v3.md §7 and the critique this fixes:
// handlers/middlewares.go's ApprovalChecker is wired ahead of EVERY route (cmd/main.go) and is
// the API's ONLY source of a 403, meaning exactly one thing — the account is not, or is no
// longer, approved. An ID token issued before an admin revokes approval stays valid up to 60
// minutes, so this is reachable mid-session, not only at sign-in.
describe('a 403 on a request that DID carry a token', () => {
  beforeEach(() => vi.mocked(fetchAuthSession).mockResolvedValue(withToken));

  it('is treated as an authorisation event, exactly as 401 already is: never an ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ message: 'Pending approval' }, { ok: false, status: 403 })),
    );

    await expect(api.get('/libraries')).rejects.toBeInstanceOf(PendingApprovalError);
    // Never a generic ApiError a page might render inline beside a "Try again" that a
    // re-approval could never satisfy.
    await expect(api.get('/libraries')).rejects.not.toBeInstanceOf(ApiError);
  });

  it('hands off to the pendingApproval session hook, not invalidate — the account is real', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ message: 'Pending approval' }, { ok: false, status: 403 })),
    );

    await api.get('/libraries').catch(() => {});
    expect(pendingApproval).toHaveBeenCalledOnce();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('does not retry — unlike 401, there is no refresh that could change the answer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ message: 'Pending approval' }, { ok: false, status: 403 })),
    );

    await api.get('/libraries').catch(() => {});
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
