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
