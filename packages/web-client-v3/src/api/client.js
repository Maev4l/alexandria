import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { config } from '@/config';
// TEMPORARY. Phase-1 evidence gathering for the session defect; revert this commit to remove it.
import {
  moduleIdentity,
  probeUser,
  reportFirstClientRead,
  sessionShape,
  snapshot,
  stampModule,
} from '@/auth/diagnose.js';

// Answers the duplication question WITHOUT waiting for a failure: if this module received a
// different Amplify copy than AuthContext did, the two ids differ here, at import, on any run.
stampModule('api/client.js', fetchAuthSession);

const BASE_URL = `${config.apiBaseUrl}/v1`;

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// A request that could not be authenticated, which never reached the network. Distinct from
// ApiError on purpose: the old code sent the request WITHOUT an Authorization header, API
// Gateway answered 401, and the reader was shown "Unauthorized" — a permissions error for what
// was actually a session-timing problem. The two conditions must never look alike again.
export class SessionUnavailableError extends Error {
  constructor(reason, cause) {
    super('Your session is not ready. Sign in again if this keeps happening.');
    this.name = 'SessionUnavailableError';
    // 'threw' or 'no-tokens' — which of the two silent paths was taken.
    this.reason = reason;
    this.cause = cause;
  }
}

// The session was rejected by the server and could not be recovered by refreshing.
export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has ended. Sign in again to continue.');
    this.name = 'SessionExpiredError';
  }
}

// Registered by AuthProvider. The client cannot navigate and must not import React state, so
// recovery is delegated: `refresh` forces Amplify to re-resolve the session, `invalidate` drops
// the user, which the router turns into a return to /login with the current route preserved.
let sessionHooks = {
  refresh: async () => {},
  invalidate: () => {},
};

export const registerSessionHooks = (hooks) => {
  sessionHooks = { ...sessionHooks, ...hooks };
};

// Never discards the reason. The previous version had two silent paths to "no header" — a bare
// `catch {}` and a falsy token — so when this failed for a real user there was no way to tell
// which had happened, and a successful retry proved only that something had changed. Whatever
// goes wrong here now says so.
const readToken = async (attempt) => {
  let session;
  try {
    session = await fetchAuthSession();
  } catch (err) {
    snapshot(`client.readToken(${attempt}) THREW`, {
      amplify: moduleIdentity(fetchAuthSession),
      error: err?.name ?? 'Error',
    });
    return { token: null, reason: 'threw', cause: err };
  }
  const token = session?.tokens?.idToken?.toString();
  if (!token) {
    // Report the whole shape, not the verdict. "No tokens" was all we ever learned last time,
    // and it does not distinguish an empty object from a session missing only its idToken.
    snapshot(`client.readToken(${attempt}) NO TOKEN`, {
      amplify: moduleIdentity(fetchAuthSession),
      ...sessionShape(session),
    });
    probeUser(`client.readToken(${attempt})`, getCurrentUser);
  }
  if (token) reportFirstClientRead(fetchAuthSession);
  return token ? { token } : { token: null, reason: 'no-tokens' };
};

const authToken = async () => {
  // Mock mode has no Cognito session by design, and the fixture API wants none.
  if (config.isMock) return null;

  const first = await readToken('first');
  if (first.token) return first.token;

  // One forced refresh, then one retry — the same policy as a 401 below. This is the case that
  // reached a real user: a token missing on the first attempt and present on a manual retry, so
  // the recovery they performed by hand is now performed for them, before anything is shown.
  await sessionHooks.refresh();
  const second = await readToken('after-forced-refresh');
  if (second.token) return second.token;

  // Deliberately loud. This is the only record of a condition that was previously invisible.
  console.warn(
    `[auth] no token after a forced refresh: first=${first.reason}, second=${second.reason}`,
    first.cause ?? second.cause ?? '',
  );
  throw new SessionUnavailableError(second.reason, second.cause ?? first.cause);
};

const parse = async (response) => {
  // Mutations return empty bodies; do not try to parse one.
  const isEmpty =
    response.status === 204 ||
    response.headers.get('content-length') === '0' ||
    !(response.headers.get('content-type') ?? '').includes('json');
  return isEmpty ? null : response.json();
};

const request = async (path, options = {}, { isRetry = false } = {}) => {
  const token = await authToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // A 401 on a request that DID carry a token is a session event, not a permissions verdict:
  // force one refresh and try once more. A reader should never be shown a raw "Unauthorized"
  // and asked to solve it with a button.
  if (response.status === 401 && !isRetry) {
    // PREVIOUSLY SILENT, and it is a failure mode we never instrumented: the request DID carry a
    // token and the server rejected it. It produces no readToken line and no warn, so a failing
    // run down this path looks, in the console, exactly like a run that never failed.
    snapshot('client 401 WITH a token, refreshing', {
      amplify: moduleIdentity(fetchAuthSession),
      path,
      tokenLength: token?.length ?? 0,
    });
    await sessionHooks.refresh();
    return request(path, options, { isRetry: true });
  }

  if (response.status === 401) {
    snapshot('client 401 AGAIN after refresh, ending the session', { path });
    sessionHooks.invalidate();
    throw new SessionExpiredError();
  }

  const data = await parse(response);

  if (!response.ok) {
    // Also previously silent. An ordinary server failure and a session failure reach the reader
    // as similar-looking errors, and only one of them was ever visible in the console.
    snapshot('client REQUEST FAILED', { path, status: response.status });
    throw new ApiError(data?.message ?? 'The request failed.', response.status, data);
  }
  return data;
};

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
