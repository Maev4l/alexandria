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
export const stubFetch = () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      const path = String(url);
      const result = path.endsWith('/libraries')
        ? { status: 200, body: { libraries } }
        // handleMockRequest returns null for a path it does not recognise; treat that as a 404
        // rather than let `result.status` throw, since an unmatched path is a real (if unlikely)
        // outcome for a guard walking every route rather than a hand-picked pair of them.
        : (handleMockRequest('GET', path) ?? { status: 404, body: { message: 'Not found' } });
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
export const getRoutePaths = () => {
  const tree = AppRoutes();
  const routesElement = tree.props.children;
  const routeChildren = routesElement.props.children;
  const routeElements = Array.isArray(routeChildren) ? routeChildren : [routeChildren];
  return routeElements
    .map((route) => route.props.path)
    .filter((path) => path !== '*'); // the catch-all is a redirect, not a screen to walk
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
