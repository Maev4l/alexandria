import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AppRoutes from '@/routes.jsx';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';
import { ToastProvider } from '@/state/ToastContext.jsx';
import { libraries } from '@/test/fixtures';
import { handleMockRequest } from '../../tools/mock-api.js';

// Shared by reachability.test.jsx ("does a control dead-end?") and
// routeLandmarks.test.jsx ("does every route render one <main> and one <h1>?"). Both press the
// REAL, wired route table (`@/routes.jsx`) rather than a hand-picked stand-in, so the machinery
// for mounting it lives here once instead of being retyped — and drifting — in each file.
export const renderApp = (initialPath) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LibrariesProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </LibrariesProvider>
    </MemoryRouter>,
  );

// A fetch stub good enough to let every route settle past its loading state, backed by the same
// fixtures/mock-api.js the rest of the suite already uses — not a second, parallel set of fakes.
//
// IT FORWARDS THE REAL METHOD AND BODY, and until now it did not: every request was dispatched to
// the mock as a `GET` regardless of what the app actually sent. Reads were unaffected, which is
// why it went unnoticed — this harness was built for route-walking guards that only ever read.
//
// But it meant any test using it COULD NOT exercise a write. A `POST .../events` reached the mock
// as a GET, so the branch that clears `lentTo` on a RETURNED event never ran, and a probe
// asserting "the stamp goes when the item comes back" failed against completely correct code.
// Found by writing exactly that probe for the browse stream — the harness, not the app, was
// answering. A stub that silently rewrites the method is a substrate that agrees with itself.
export const stubFetch = () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init) => {
      const path = String(url);
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(init.body) : undefined;
      const result = path.endsWith('/libraries') && method === 'GET'
        ? { status: 200, body: { libraries } }
        // handleMockRequest returns null for a path it does not recognise; treat that as a 404
        // rather than let `result.status` throw, since an unmatched path is a real (if unlikely)
        // outcome for a guard walking every route rather than a hand-picked pair of them.
        : (handleMockRequest(method, path, body) ?? { status: 404, body: { message: 'Not found' } });
      return {
        ok: result.status < 400,
        status: result.status,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => result.body,
      };
    }),
  );
};

// Derives the route list from the ACTUAL route table rather than a hand-copied one, so a screen
// added to routes.jsx is picked up by any guard built on this without a second edit anywhere.
// AppRoutes has no hooks of its own — RequireAuth's hook lives in a child component that this
// never invokes — so calling it as a plain function is safe and returns exactly the React
// elements the JSX produced (Suspense > Routes > Route[]), with no rendering involved.
// RECURSIVE, because the table is no longer flat. The add flow's four routes now sit inside a
// PATHLESS layout <Route> that renders only the filing-session provider's <Outlet/>
// (routes.jsx) — their URLs are unchanged, but a one-level scan sees one route with
// `path === undefined` where four screens used to be. That is precisely how it failed when the
// layout landed: `undefined` in the walked list, four screens silently dropped, and the
// not-shrinking assertion catching it. A layout route contributes its CHILDREN, never itself.
const collectRoutePaths = (node) => {
  if (node == null || node === false) return [];
  if (Array.isArray(node)) return node.flatMap(collectRoutePaths);
  const { path, children } = node.props ?? {};
  // A pathless route is a layout: it renders no screen of its own, so only its children are
  // walkable. A route WITH a path is a screen — and cannot also nest children in this table.
  if (path === undefined) return collectRoutePaths(children);
  return path === '*' ? [] : [path]; // the catch-all is a redirect, not a screen to walk
};

export const getRoutePaths = () => {
  const tree = AppRoutes();
  const routesElement = tree.props.children;
  return collectRoutePaths(routesElement.props.children);
};

// Concrete IDs that exist in the shared fixtures (src/test/fixtures), so a dynamic segment in a
// walked route resolves to a real record rather than a 404/"not found" state. Shared by every
// route-walking guard (routeLandmarks.test.jsx, routeExits.test.jsx, …) rather than retyped in
// each — a second, drifting copy of this table is exactly the kind of duplication that let the
// exit-mechanism defect (see routeExits.test.jsx) go unnoticed for three slices while a sibling
// guard walked the same table for a different assertion.
export const PARAM_VALUES = {
  libraryId: 'lib-fiction', // has items, a collection, and sharedTo — exercises the most branches
  itemId: 'item-lent', // has authors, an ISBN, a lend event and history — richest single fixture
  collectionId: 'coll-melville',
};

// Substitutes every `:param` in a route path with its fixture value. Throws rather than
// rendering a literal "undefined" in the URL, so a route added with a param this table does not
// know about fails the guard loudly instead of silently not exercising the route it claims to.
export const fillRouteParams = (path) =>
  path.replace(/:([a-zA-Z]+)/g, (match, name) => {
    if (!(name in PARAM_VALUES)) {
      throw new Error(
        `route-walking guard: no fixture value registered for :${name} (route "${path}"). ` +
          'Add one to PARAM_VALUES in src/test/appHarness.jsx rather than letting this route ' +
          'render with a literal "undefined".',
      );
    }
    return PARAM_VALUES[name];
  });
