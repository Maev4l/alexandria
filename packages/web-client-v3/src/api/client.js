import { fetchAuthSession } from 'aws-amplify/auth';
import { config } from '@/config';

const BASE_URL = `${config.apiBaseUrl}/v1`;

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // The server's own body, kept for diagnosis (e.g. `err.data?.message` in a console capture)
    // — but `message` above is ALWAYS app-authored, from STATUS_COPY below. Never the reverse:
    // that was the defect. A 500 carrying {"message":"Unauthorized"} printed "Unauthorized" on
    // screen because `message` used to be `data?.message` directly (.claude/ui-v3.md §7).
    this.data = data;
  }
}

// 403 is not a generic permission failure in this API: `ApprovalChecker`
// (packages/functions/api/handlers/middlewares.go) is the ONLY source of a 403 anywhere in the
// API, wired ahead of every route in cmd/main.go, and it means exactly one thing — the account
// behind this token is not, or is no longer, approved. An ID token issued before an admin revokes
// approval stays valid for up to 60 minutes, so this is reachable mid-session, not only at
// sign-in. It is therefore an authorisation EVENT, handled the same way a 401 already is: the
// client cannot navigate, so it hands off to the session hooks AuthProvider registers, which flip
// the reader to the existing PendingApproval state — never an inline error with a "Try again"
// that no amount of retrying can satisfy.
export class PendingApprovalError extends Error {
  constructor() {
    super('This account is awaiting approval.');
    this.name = 'PendingApprovalError';
  }
}

// Reader-facing copy for a non-2xx, non-403 response, per ui-v3.md §7: say what the app failed to
// do and, where recovery is possible, what the reader can do next — never the server's own
// phrasing, which `.claude/backend.md`'s own backlog plans to change out from under this client.
// Keyed by status only for the two cases specific enough to name (400 is validation, generic
// across every form in the app; 409 has exactly one source — a duplicate collection name,
// `handlers/collections.go` — so it is named for that rather than left generic).
const STATUS_COPY = {
  400: 'That request was not accepted. Check what you entered and try again.',
  404: 'That could not be found. It may have been moved or deleted.',
  409: 'That name is already used in this library. Choose a different one.',
};

const copyForStatus = (status) => {
  if (status in STATUS_COPY) return STATUS_COPY[status];
  if (status >= 500) return 'Something went wrong on our side. Try again in a moment.';
  return 'That request could not be completed. Try again.';
};

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
// `pendingApproval` flips the reader to the PendingApproval state without dropping the session —
// unlike `invalidate`, the account is real and signed in, just not (or no longer) approved.
let sessionHooks = {
  refresh: async () => {},
  invalidate: () => {},
  pendingApproval: () => {},
};

export const registerSessionHooks = (hooks) => {
  sessionHooks = { ...sessionHooks, ...hooks };
};

// Never discards the reason. The previous version had two silent paths to "no header" — a bare
// `catch {}` and a falsy token — so when this failed for a real user there was no way to tell
// which had happened, and a successful retry proved only that something had changed. Whatever
// goes wrong here now says so.
const readToken = async () => {
  let session;
  try {
    session = await fetchAuthSession();
  } catch (err) {
    return { token: null, reason: 'threw', cause: err };
  }
  const token = session?.tokens?.idToken?.toString();
  return token ? { token } : { token: null, reason: 'no-tokens' };
};

const authToken = async () => {
  // Mock mode has no Cognito session by design, and the fixture API wants none.
  if (config.isMock) return null;

  const first = await readToken();
  if (first.token) return first.token;

  // One forced refresh, then one retry — the same policy as a 401 below.
  //
  // THIS IS NOT WHAT THE SECOND READER HIT, despite what this comment claimed for four commits.
  // Her request fired while signed out, fifteen seconds before sign-in, and no retry could have
  // helped because there was no session to find; that is fixed in App.jsx's Gate. The retry is
  // kept for the case it actually covers — a token expiring or being evicted mid-session, where
  // one forced refresh genuinely produces it — and a test pins that case. Kept for a stated
  // reason, not by inheritance.
  await sessionHooks.refresh();
  const second = await readToken();
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

// The one instrument kept from the session-defect investigation, and kept deliberately.
//
// Every other log in this client fired only on failure, which meant that when a reader reported
// a problem, the ABSENCE of a line was ambiguous between three different situations: the request
// was never made, it succeeded, or the console capture was truncated. Three captures were read
// wrongly for exactly that reason, and the root cause — a request firing fifteen seconds before
// the reader signed in — was invisible until a request announced itself unconditionally.
//
// Not gated to dev builds, and that is the point. The failures worth this line are the ones a
// remote reader hits and nobody else can reproduce; dev-only logging is precisely absent then.
// Path and status only: no token, no claims, no body, and the paths carry opaque ids.
const trace = (event, detail) => console.info(`[api] ${event}`, detail);

const request = async (path, options = {}, { isRetry = false } = {}) => {
  trace('start', { path, method: options.method ?? 'GET', isRetry });
  const token = await authToken();

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (err) {
    // fetch() REJECTS for a network failure (offline, DNS, CORS) instead of resolving with a
    // response, so it never reaches the status handling below. Uncaught, this threw the
    // browser's own wording ("Failed to fetch", "NetworkError when attempting to fetch resource")
    // straight at a reader — the same defect as printing the server's message, one layer lower.
    trace('network-error', { path, message: err.message });
    throw new ApiError('Could not reach the server. Check your connection and try again.', null, null);
  }

  // Before the 401 branches, so that every response yields exactly one outcome line. After them,
  // a 401 returns early and logs nothing, making the status most worth tracing the only one
  // without a trace.
  trace('outcome', { path, status: response.status, ok: response.ok });

  // A 401 on a request that DID carry a token is a session event, not a permissions verdict:
  // force one refresh and try once more. A reader should never be shown a raw "Unauthorized"
  // and asked to solve it with a button.
  if (response.status === 401 && !isRetry) {
    await sessionHooks.refresh();
    return request(path, options, { isRetry: true });
  }

  if (response.status === 401) {
    sessionHooks.invalidate();
    throw new SessionExpiredError();
  }

  const data = await parse(response);

  if (!response.ok) {
    // Logged here, deliberately, unlike the body-free trace above: the server's exact words are
    // exactly what a remote diagnosis needs when a reader reports a failure nobody else can
    // reproduce (see the comment on `trace`, above — three misread captures is why that line
    // exists at all). They go no further than this line; STATUS_COPY is what a reader sees.
    trace('error-detail', { path, status: response.status, serverMessage: data?.message ?? null });

    // See PendingApprovalError, above: 403 in this API is never a generic failure, so it never
    // becomes an ApiError a page might render inline next to a "Try again" that cannot succeed.
    if (response.status === 403) {
      sessionHooks.pendingApproval();
      throw new PendingApprovalError();
    }

    throw new ApiError(copyForStatus(response.status), response.status, data);
  }
  return data;
};

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
