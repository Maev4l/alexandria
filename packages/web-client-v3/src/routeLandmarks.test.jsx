import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fillRouteParams, getRoutePaths, renderApp, stubFetch } from '@/test/appHarness.jsx';

// The guard named in the design session's f5 task: every route in the app must render exactly
// one <main> and exactly one <h1>. Zero is the defect the landmark work fixed; two is a defect
// too — a screen with two <main>s or two <h1>s has an ambiguous outline, which is just as wrong
// as having none. jsdom is legitimate for this: it is a DOM-structure fact, not computed style,
// layout or focus (those live in scripts/check-browser.mjs, the browser-driven suite).
//
// ROUTE LIST: derived from the REAL route table (`@/routes.jsx`) via `getRoutePaths()|`, not
// retyped here — a hardcoded list would silently stop covering the app the moment a NEW screen
// lands, since a new screen brings a new route the list does not have, which is exactly the
// failure this guard exists to close ("Slice C added landmarks to the files slice C touched and
// nowhere else"). A stub becoming built changes nothing here: the path was already covered. Every path returned by
// getRoutePaths() is asserted on below; a route added to
// routes.jsx with no corresponding params entry fails LOUDLY (via the param-substitution check)
// rather than being silently skipped.
vi.mock('@/auth/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { id: 'OWNER1', initials: 'JR', email: 'jr@example.com', approved: true } }),
}));

beforeEach(stubFetch);
afterEach(() => vi.unstubAllGlobals());

// PARAM_VALUES / fillRouteParams (concrete fixture IDs for every dynamic segment, so a route
// resolves to a real record rather than a 404/"not found" state — which would still carry its
// own single main/h1, see EditLibrary/EditCollection/ItemDetail/EditItem's "not found" branches,
// but would not exercise the READY state the route exists to show) now live in
// `@/test/appHarness.jsx`, shared with routeExits.test.jsx rather than retyped here.
const fillParams = fillRouteParams;

const allRoutePaths = getRoutePaths();

// Coverage ledger — every path returned by the real route table lands in exactly one of these
// two buckets, and the reasons are stated so a reader of CI output cannot mistake this guard's
// scope for "all of routes.jsx" when in fact a route was excluded. MEASURED, not predicted: this
// guard was first run with an EMPTY exclusion list (every path in `walkedPaths`) to find out
// which ones actually fail to reach a ready main/h1 in jsdom, per this project's own rule that
// "an exclusion must be justified by a measurement, not a prediction." /login and /signup landed
// clean on that run (Login.jsx does not gate on auth state — it only redirects away FROM itself
// on a successful sign-in — so the authed-harness mock does not prevent them rendering), so
// there was never a reason to exclude them, and the empty list below is the honest result: this
// guard walks every single route in routes.jsx.
const NOT_WALKED = new Map();

const walkedPaths = allRoutePaths.filter((path) => !NOT_WALKED.has(path));

describe('every routed screen renders exactly one <main> and exactly one <h1>', () => {
  it('the route table is not empty and is not silently shrinking', () => {
    // A regression here (e.g. getRoutePaths() returning []) would make every `it.each` below
    // vacuously pass with zero assertions — the exact "describe block titled every route that
    // tested two" failure mode this project has already been bitten by once. Pin the count.
    expect(allRoutePaths.length).toBeGreaterThanOrEqual(21);
    expect(walkedPaths.length).toBe(allRoutePaths.length); // nothing excluded — see NOT_WALKED above
  });

  it.each(walkedPaths)('%s renders exactly one <main> and one <h1>', async (routePath) => {
    const concretePath = fillParams(routePath);
    renderApp(concretePath);

    // Every state a screen can land in (loading, "not found", ready) carries its own main+h1 —
    // confirmed by reading each held page file before writing this guard — so waiting for the
    // first <main> to exist is enough to get past the lazy-loaded Suspense fallback
    // (`RouteFallback`, which deliberately has neither) without needing per-page fixture text.
    await vi.waitFor(
      () => {
        expect(document.querySelectorAll('main').length).toBeGreaterThan(0);
      },
      { timeout: 8000 },
    );

    const mains = document.querySelectorAll('main');
    const h1s = document.querySelectorAll('h1');

    expect(mains.length, `expected exactly one <main> on ${concretePath}, found ${mains.length}`).toBe(1);
    expect(h1s.length, `expected exactly one <h1> on ${concretePath}, found ${h1s.length}`).toBe(1);
  });
});

// Documents what this file does not cover and why, so a reader of the source (not just CI
// output) gets the same honest scope statement, rather than one that only lives in a PR
// description. Right now that list is empty — every route in routes.jsx is walked above — and
// this test pins that fact so a future exclusion is a deliberate, reviewed edit to NOT_WALKED
// (with its measurement recorded in the comment above it) and not a silent scope shrink.
describe('routes this guard does not walk, and why', () => {
  it('lists the excluded routes (currently none) and confirms nothing else was silently dropped', () => {
    const excludedPaths = [...NOT_WALKED.keys()];
    expect(excludedPaths).toEqual([]);
    // Every route in the real table is accounted for: either walked above, or named here.
    expect(new Set([...walkedPaths, ...excludedPaths])).toEqual(new Set(allRoutePaths));
  });
});
