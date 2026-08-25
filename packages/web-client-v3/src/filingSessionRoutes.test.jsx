import { describe, expect, it } from 'vitest';
import AppRoutes from '@/routes.jsx';
import AddFlowLayout from '@/components/AddFlowLayout.jsx';

// The session tally is defined by WHERE its provider is mounted: a pathless layout route above
// the four add-flow routes, so it stays mounted across capture -> results -> capture and unmounts
// (resetting) the moment the reader leaves. Flatten those routes back out and nothing breaks
// loudly — the tally would simply read nothing, for ever, because a provider remounted per
// navigation always starts at zero. That is a silent regression, so the nesting itself is
// asserted rather than left to be inferred from behaviour.
//
// `check:browser` proves the tally actually ACCUMULATES through real saves; this proves the
// structure that makes accumulation possible, which is the half a unit test can see.
const ADD_ROUTES = [
  '/libraries/:libraryId/add/book',
  '/libraries/:libraryId/add/book/results',
  '/libraries/:libraryId/add/video',
  '/libraries/:libraryId/add/video/results',
];

// AppRoutes has no hooks of its own, so calling it as a plain function returns the React elements
// its JSX produced — the same technique appHarness.jsx's getRoutePaths already relies on.
const routeChildren = () => {
  const children = AppRoutes().props.children.props.children;
  return Array.isArray(children) ? children : [children];
};

describe('the add flow is nested under the filing-session provider', () => {
  const layouts = routeChildren().filter((route) => route.props.path === undefined);

  it('has exactly one pathless layout route, and it is the add-flow layout', () => {
    expect(layouts).toHaveLength(1);
    expect(layouts[0].props.element.type).toBe(AddFlowLayout);
  });

  it('wraps every add-flow route and nothing else', () => {
    const nested = layouts[0].props.children;
    const paths = (Array.isArray(nested) ? nested : [nested]).map((route) => route.props.path);
    expect(paths.sort()).toEqual([...ADD_ROUTES].sort());
  });

  it('leaves those routes at the URLs they already had', () => {
    // A layout route contributes no path segment. If one ever did, every add-flow URL in the app
    // — and every link, redirect and browser check naming one — would move at once.
    const topLevelPaths = routeChildren()
      .map((route) => route.props.path)
      .filter(Boolean);
    for (const addRoute of ADD_ROUTES) {
      expect(topLevelPaths).not.toContain(addRoute);
    }
  });
});
