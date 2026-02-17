// Edited by Claude.
// Navigation context: provides declarative navigation state management
// Inspired by React Navigation's approach to screen/tab configuration
import { createContext, useContext, useState, useMemo, useCallback, useRef } from 'react';

const NavigationContext = createContext(null);

// Separate context for screen-specific params (allows stacked screens to keep their own params)
// Uses undefined as default to distinguish "no provider" from "provider with null params"
const ScreenParamsContext = createContext(undefined);

// Provider that overrides params for a specific screen
export const ScreenParamsProvider = ({ params, children }) => {
  return (
    <ScreenParamsContext.Provider value={params}>
      {children}
    </ScreenParamsContext.Provider>
  );
};

export const NavigationProvider = ({ children, initialRoute = null }) => {
  const [currentRoute, setCurrentRoute] = useState(initialRoute);
  const [navigationStack, setNavigationStack] = useState([]);
  const [screenOptions, setScreenOptions] = useState({});
  const [routeParams, setRouteParams] = useState(null);

  // Ref for scroll-to-top callback (pages can register their scroll handler)
  const scrollToTopRef = useRef(null);

  // Ref to track latest stack for synchronous multiple goBack calls
  const stackRef = useRef(navigationStack);
  stackRef.current = navigationStack;

  // Navigate to a route, optionally pushing to stack for back navigation
  const navigate = useCallback((route, options = {}) => {
    if (options.push) {
      // Store both route and params in the stack for proper restoration
      setNavigationStack((prev) => [...prev, { route: currentRoute, params: routeParams }]);
    }
    setCurrentRoute(route);
    setRouteParams(options.params || null);
    // Reset screen options when navigating
    setScreenOptions({});
  }, [currentRoute, routeParams]);

  // Go back to previous screen in stack
  // Uses ref to support multiple synchronous goBack() calls
  const goBack = useCallback(() => {
    const stack = stackRef.current;
    if (stack.length > 0) {
      const prevEntry = stack[stack.length - 1];
      const newStack = stack.slice(0, -1);
      // Update ref immediately for subsequent synchronous calls
      stackRef.current = newStack;
      setNavigationStack(newStack);
      setCurrentRoute(prevEntry.route);
      setRouteParams(prevEntry.params || null);
      // Reset screen options so previous screen can set its own
      setScreenOptions({});
      return true;
    }
    return false;
  }, []);

  // Check if we can go back
  const canGoBack = navigationStack.length > 0;

  // Allow screens to set their options (title, headerRight, etc.)
  const setOptions = useCallback((options) => {
    setScreenOptions((prev) => ({ ...prev, ...options }));
  }, []);

  // Register a scroll-to-top handler for the current screen
  const registerScrollToTop = useCallback((handler) => {
    scrollToTopRef.current = handler;
    // Return cleanup function
    return () => {
      scrollToTopRef.current = null;
    };
  }, []);

  // Trigger scroll-to-top (called by AppBar on title tap)
  const triggerScrollToTop = useCallback(() => {
    scrollToTopRef.current?.();
  }, []);

  const value = useMemo(() => ({
    currentRoute,
    params: routeParams,
    navigationStack,
    navigate,
    goBack,
    canGoBack,
    screenOptions,
    setOptions,
    registerScrollToTop,
    triggerScrollToTop,
  }), [currentRoute, routeParams, navigationStack, navigate, goBack, canGoBack, screenOptions, setOptions, registerScrollToTop, triggerScrollToTop]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  const screenParams = useContext(ScreenParamsContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  // Use screen-specific params if provider exists (for stacked screens), otherwise use current route params
  return {
    ...context,
    params: screenParams !== undefined ? screenParams : context.params,
  };
};
