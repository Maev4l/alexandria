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
export const probeUser = async (getCurrentUser) => {
  try {
    const current = await getCurrentUser();
    return { getCurrentUser: 'resolved', hasUsername: Boolean(current?.username) };
  } catch (err) {
    return { getCurrentUser: `rejected:${err?.name ?? 'Error'}` };
  }
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
