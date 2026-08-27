import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fillRouteParams, getRoutePaths, renderApp, stubFetch } from '@/test/appHarness.jsx';

// The guard for the critique's [P2] "the exit mechanism — seven routes have no way out". Seven
// routes (AddBook, AddVideo, BookDetectionResults, VideoDetectionResults, Settings, Account,
// About) were measured to have ZERO focusable elements: `AppHeader`'s wordmark rendered as a
// `<span>`, not a `<Link>`, whenever no `onBack` was supplied. On a PWA installed standalone
// (`index.html` sets `apple-mobile-web-app-capable=yes`; `VitePWA` defaults to standalone) there
// is no browser chrome and no back gesture, so that was not an inconvenience — it was
// force-quit-or-nothing, and the app's own cataloguing flow began there.
// routeLandmarks.test.jsx already proves every route renders exactly one <main> and one <h1>;
// this proves the landmark is not also a dead end. Landed now rather than after the next screens
// are written, it makes the trap impossible to reintroduce — landed later it could only report
// that later work happened to get it right.
//
// DEFINITION — "a control that leaves this route" is either of the two mechanisms this app
// actually uses to change screens (confirmed by reading every `<Link`/`onBack=` call site in
// `src/` before writing this guard, not assumed):
//   1. the header's Back button — `aria-label="Back"`, `AppHeader`'s one `history.back()`
//      control, the exact mechanism `Search.jsx`'s own comment names — or
//   2. a same-document link (an `<a>` — every navigational anchor in this app is a `<Link>`,
//      there are no raw `<a href>`s) whose `href` resolves to a path OTHER than the one
//      currently on screen.
// Both are disqualified if disabled: `disabled` on the button, `aria-disabled="true"` on the
// link. A disabled control cannot currently fire, so it is not an exit, it is a decoy — the same
// reasoning already applies to a not-yet-valid primary action. A link back to the
// SAME path is also disqualified: the wordmark now links home (this guard's own fix), and on the
// libraries root itself that link's `href` equals the current path, so it does not count there —
// the root's real exit is the account plate to `/settings`, asserted below like everywhere else.
//
// What this deliberately does NOT count, and why loosening it would defeat the guard: a button
// with no `href` that opens a sheet (Edit / Lend / Delete / Share / the lend-name form, …). Its
// activation changes what is drawn ON the route, not what route the reader is ON — Cancel or
// Escape returns them to the exact screen they were already on. Every one of the seven dead
// screens this guard exists to catch still has a header with `search={false}` and renders no
// sheet at all, so counting a sheet trigger would make this guard pass on the exact trap it was
// written to name. The other direction — requiring a control specifically LABELLED "Back" on
// every route — would fail legitimate screens whose only exit is a content link (the libraries
// root's account plate, item detail's "IN <library>" mark), which is why case (2) above is
// href-based rather than label-based.
const isExitControl = (element, currentPath) => {
  if (element.tagName === 'BUTTON') {
    if (element.disabled) return false;
    return (element.getAttribute('aria-label') ?? '').toLowerCase() === 'back';
  }
  if (element.tagName === 'A') {
    if (element.getAttribute('aria-disabled') === 'true') return false;
    const href = element.getAttribute('href');
    return Boolean(href) && href !== currentPath;
  }
  return false;
};

vi.mock('@/auth/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { id: 'OWNER1', initials: 'JR', email: 'jr@example.com', approved: true } }),
}));

beforeEach(stubFetch);
afterEach(() => vi.unstubAllGlobals());

const allRoutePaths = getRoutePaths();

// Coverage ledger, same shape and same honesty rule as routeLandmarks.test.jsx: every path in the
// real route table lands in exactly one of these two buckets, stated so a reader of CI output
// cannot mistake this guard's scope for "all of routes.jsx" when a route was actually excluded.
// MEASURED, not predicted, per this project's own rule ("an exclusion must be justified by a
// measurement, not a prediction"): this guard was first run against the full, unfiltered route
// list with NOT_WALKED empty. Every one of the 22 routes reached a ready main/h1 and was
// evaluated for an exit — the same mounting mechanism routeLandmarks.test.jsx already proved
// works for all 22 with zero exclusions — so there was never a reason to exclude any of them, and
// the empty list below is the honest result.
const NOT_WALKED = new Map();

const walkedPaths = allRoutePaths.filter((path) => !NOT_WALKED.has(path));

describe('every routed screen has at least one control that leaves it', () => {
  it('the route table is not empty and is not silently shrinking', () => {
    // Same regression this project has already been bitten by once (routeLandmarks.test.jsx):
    // an empty route list would make every it.each below vacuously pass with zero assertions.
    expect(allRoutePaths.length).toBeGreaterThanOrEqual(21);
    expect(walkedPaths.length).toBe(allRoutePaths.length); // nothing excluded — see NOT_WALKED above
  });

  it.each(walkedPaths)('%s renders at least one control that leaves it', async (routePath) => {
    const concretePath = fillRouteParams(routePath);
    renderApp(concretePath);

    await vi.waitFor(
      () => {
        expect(document.querySelectorAll('main').length).toBeGreaterThan(0);
      },
      { timeout: 8000 },
    );

    const candidates = [...document.querySelectorAll('a, button')];
    const exits = candidates.filter((element) => isExitControl(element, concretePath));

    expect(
      exits.length,
      `expected ${concretePath} to render at least one control that leaves it (the header's ` +
        `Back button, or a link to a different route) — found none among ${candidates.length} ` +
        'button/link elements on the page. A screen with zero exits is a trap on any device with ' +
        'no back gesture (installed PWA, kiosk, …).',
    ).toBeGreaterThan(0);
  });
});

// Same purpose as routeLandmarks.test.jsx's matching block: documents what this guard does not
// cover and why in the SOURCE, not only in CI output, so a future exclusion is a deliberate,
// reviewed edit to NOT_WALKED (with its measurement recorded above it) rather than a silent scope
// shrink.
describe('routes this guard does not walk, and why', () => {
  it('lists the excluded routes (currently none) and confirms nothing else was silently dropped', () => {
    const excludedPaths = [...NOT_WALKED.keys()];
    expect(excludedPaths).toEqual([]);
    expect(new Set([...walkedPaths, ...excludedPaths])).toEqual(new Set(allRoutePaths));
  });
});
