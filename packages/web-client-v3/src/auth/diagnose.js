// TEMPORARY Phase-1 instrumentation for the fresh-profile session defect. It OBSERVES only —
// it must not change any behaviour, and it is to be deleted once the root cause is established.
//
// The sequence to explain, now known to be reproducible in a fresh incognito profile and never
// on a warm one: within a single page load, AuthContext's read returns TOKENS (the app renders),
// the API client's read returns NONE, a forced refresh returns NONE, and a manual retry seconds
// later works. Nothing signs anyone out — the sign-out instrumentation is silent.
//
// NEVER LOGS A CREDENTIAL. Token values are never printed; only whether a field is present.
// Amplify's storage keys embed the username, so only each key's LAST SEGMENT is printed —
// idToken, accessToken, refreshToken, LastAuthUser — which identifies what exists without
// revealing whose it is. The user will paste this output, so it has to be safe to paste.
export const DIAGNOSE = true;

// Shared across every copy of THIS module. If the module graph is duplicated, each copy would
// otherwise keep its own counter and hand out the same ids, hiding the very thing being counted.
const registry = (globalThis.__alexandriaDiag ??= { next: 0, marks: new WeakMap() });

const started = typeof performance === 'undefined' ? 0 : performance.now();
const at = () => `t+${Math.round(performance.now() - started)}ms`;

// THE MEASUREMENT THAT DISCRIMINATES. Everything else describes what a read returned; this asks
// whether the two callers are talking to the SAME Amplify at all.
//
// The reported sequence is two different answers from one function in one document — AuthContext
// holds tokens while the API client, moments later, has none and cannot force one into existence,
// yet a retry seconds later works. That is hard to explain within one token store and trivial to
// explain with two: a second copy of the Amplify module graph has its own store, was never
// reached by Amplify.configure(), and answers honestly that it knows of no session.
//
// Two copies are exactly what a dev server can serve on a COLD browser cache, which is the
// condition under which this reproduces: dependency re-optimization can change the URL a
// dependency is served from between two imports in the same page. A warm cache re-uses the
// earlier URLs and the split never appears.
//
// Identity is taken from the imported function OBJECT, so two module instances necessarily
// produce two ids. Same id at both call sites kills this outright.
export const moduleIdentity = (fn) => {
  if (typeof fn !== 'function') return 'not-a-function';
  const seen = registry.marks.get(fn);
  if (seen) return seen;
  registry.next += 1;
  const id = `amplify#${registry.next}`;
  registry.marks.set(fn, id);
  return id;
};

const COGNITO_PREFIX = 'CognitoIdentityServiceProvider';

// Which Cognito artefacts exist in local storage right now, by kind only.
export const storageKinds = () => {
  try {
    const kinds = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(COGNITO_PREFIX)) kinds.push(key.split('.').pop());
    }
    return kinds.sort();
  } catch (err) {
    // Storage itself being unavailable is a candidate explanation, so say so rather than throw.
    return [`<localStorage unavailable: ${err.name}>`];
  }
};

// The SHAPE of a session result — is it an empty object, or an object whose tokens are missing
// while other fields survive? Those are different failures and the console cannot currently
// tell them apart.
export const sessionShape = (session) => {
  if (session === null || session === undefined) return { session: String(session) };
  return {
    keys: Object.keys(session).sort(),
    hasTokens: Boolean(session.tokens),
    hasIdToken: Boolean(session.tokens?.idToken),
    hasAccessToken: Boolean(session.tokens?.accessToken),
    hasCredentials: Boolean(session.credentials),
    hasIdentityId: Boolean(session.identityId),
    hasUserSub: Boolean(session.userSub),
    // An expiry already in the past would mean the token is real but dead, which reads as
    // "no session" in a different way than a token that was never there.
    ...expiryOf(session.tokens?.idToken),
  };
};

const expiryOf = (idToken) => {
  const exp = idToken?.payload?.exp;
  if (typeof exp !== 'number') return {};
  return { exp, secondsToExpiry: Math.round(exp - Date.now() / 1000) };
};

// Does Amplify believe a user is signed in AT THIS INSTANT, from THIS caller's module instance?
// The caller passes its own getCurrentUser so the answer describes its own copy, not ours.
// Never logs the username — only whether one came back.
//
// DELIBERATELY NOT AWAITED BY ITS CALLERS. Both call sites sit directly between a failing read
// and the forced refresh that follows it, which is the exact window under measurement. Awaiting
// a network-capable call there would push the retry later in wall-clock time, and if the
// condition is time-dependent the retry would then start succeeding — the instrument curing the
// symptom it exists to observe, and the result reading as a repair to anyone downstream. So this
// is fired and left to report on its own; the caller's timing is unchanged.
export const probeUser = (label, getCurrentUser) => {
  if (!DIAGNOSE) return;
  const asked = performance.now();
  const report = (result) =>
    console.info(`[diag ${at()}] ${label} getCurrentUser`, {
      ...result,
      // How long the probe itself took, so it can never be mistaken for the read's own latency.
      probeMs: Math.round(performance.now() - asked),
    });
  Promise.resolve()
    .then(() => getCurrentUser())
    .then((current) => report({ getCurrentUser: 'resolved', hasUsername: Boolean(current?.username) }))
    .catch((err) => report({ getCurrentUser: `rejected:${err?.name ?? 'Error'}` }));
};

// Does a write to localStorage actually persist here? A private window can restrict, cap or
// partition the store, and Amplify keeps its tokens in it. A write that silently no-ops
// produces exactly the observed shape: sign-in succeeds and the first read is served from
// memory, a later read falls through to a store that never took the write, and
// fetchAuthSession resolves successfully with nothing in it.
export const storageWritable = () => {
  const probe = '__alexandria_diag__';
  try {
    localStorage.setItem(probe, '1');
    const readBack = localStorage.getItem(probe);
    localStorage.removeItem(probe);
    if (readBack !== '1') return 'silently-dropped';
    return 'ok';
  } catch (err) {
    return `throws:${err.name}`;
  }
};

// Stamps the Amplify copy a module received AT IMPORT TIME, before anything has failed.
//
// The first run answered nothing about duplication: every id came from AuthContext, because the
// API client only speaks when it fails. Waiting for a failure to learn whether there are two
// copies is the wrong way round — the copies exist from the moment the modules load, or they do
// not, and the answer is the same either way. Two different ids here means duplication, on a run
// that succeeds, with no race to catch.
export const stampModule = (label, fn) => {
  if (!DIAGNOSE) return;
  console.info(`[diag ${at()}] module ${label}`, { amplify: moduleIdentity(fn) });
};

// The client's successful read, logged ONCE per page load. Without it a passing run says nothing
// about how close it came: the same run that succeeds at 40ms after sign-in and the one that
// succeeds at 900ms look identical in the log, and only one of them is near the boundary.
let clientReadReported = false;
export const reportFirstClientRead = (fn) => {
  if (!DIAGNOSE || clientReadReported) return;
  clientReadReported = true;
  console.info(`[diag ${at()}] client.readToken FIRST SUCCESS`, { amplify: moduleIdentity(fn) });
};

// The success side of the age comparison. A retry that succeeds is ALWAYS logged, because it is
// the direct counterpart to the failure that preceded it; an ordinary success is logged once per
// page load, enough to establish the baseline age without flooding the console.
let acceptedReported = false;
export const reportAcceptedToken = (path, isRetry, token) => {
  if (!DIAGNOSE) return;
  if (!isRetry && acceptedReported) return;
  if (!isRetry) acceptedReported = true;
  console.info(`[diag ${at()}] client token ACCEPTED${isRetry ? ' on retry' : ''}`, {
    path,
    ...tokenFacts(token),
  });
};

export const snapshot = (label, extra = {}) => {
  if (!DIAGNOSE) return;
  console.info(`[diag ${at()}] ${label}`, {
    ...extra,
    storage: storageKinds(),
    writable: storageWritable(),
  });
};

// Answers "how long is the window" directly, rather than by inference. Polls until an idToken
// appears in storage and reports the elapsed time. Observation only — nothing waits on this.
export const watchForTokens = (label, timeoutMs = 15_000) => {
  if (!DIAGNOSE) return;
  const begin = performance.now();
  const tick = () => {
    const kinds = storageKinds();
    if (kinds.includes('idToken')) {
      console.info(
        `[diag ${at()}] ${label}: idToken appeared in storage after ${Math.round(performance.now() - begin)}ms`,
        { storage: kinds },
      );
      return;
    }
    if (performance.now() - begin > timeoutMs) {
      console.info(`[diag ${at()}] ${label}: no idToken in storage after ${timeoutMs}ms`, {
        storage: kinds,
      });
      return;
    }
    setTimeout(tick, 50);
  };
  setTimeout(tick, 50);
};

// The claims of a token AS SENT, decoded locally. Signature untouched and never inspected: the
// question is what the authorizer was asked to accept, not whether we can validate it.
//
// PASTE-SAFE BY CONSTRUCTION. Only iss, aud, exp, iat and token_use are read. `sub`, `email`,
// `name` and every custom claim are never touched, and the token itself is never logged.
const decodeClaims = (token) => {
  const payload = token?.split('.')[1];
  if (!payload) return null;
  const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    payload.length + ((4 - (payload.length % 4)) % 4),
    '=',
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (ch) => ch.codePointAt(0));
  // TextDecoder rather than atob alone: claims can hold non-ASCII and latin1 would corrupt them.
  return JSON.parse(new TextDecoder().decode(bytes));
};

export const tokenFacts = (token) => {
  let claims;
  try {
    claims = decodeClaims(token);
  } catch (err) {
    return { claims: `undecodable:${err?.name ?? 'Error'}` };
  }
  if (!claims) return { claims: 'absent' };

  const nowSeconds = Date.now() / 1000;
  return {
    iss: claims.iss,
    // May be a string or an array depending on the issuer; normalise so the log is comparable.
    aud: Array.isArray(claims.aud) ? claims.aud.join(',') : claims.aud,
    token_use: claims.token_use,
    iat: claims.iat,
    exp: claims.exp,
    // THE MEASUREMENT. A token refused while seconds old and accepted while minutes old is a
    // validity-window problem at the validator, not a defect in anything we wrote.
    //
    // Stated honestly: this is computed against the BROWSER's clock, and iat came from Cognito's,
    // so it is the token's age PLUS any skew between the two. It is not the authorizer's view —
    // nothing in the browser can be. A negative age means this machine's clock is behind
    // Cognito's, which is itself worth seeing, and is why the raw number is printed rather than
    // clamped to zero.
    ageSecondsBrowserClock: Math.round(nowSeconds - claims.iat),
    secondsToExpiry: Math.round(claims.exp - nowSeconds),
  };
};
