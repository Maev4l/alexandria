// Edited by Claude.
// Navigation context: provides declarative navigation state management
// Inspired by React Navigation's approach to screen/tab configuration
import { createContext, useContext, useState, useMemo, useCallback, useRef } from 'react';

const NavigationContext = createContext(null);

export const NavigationProvider = ({ children, initialRoute = null }) => {
  const [currentRoute, setCurrentRoute] = useState(initialRoute);
  const [navigationStack, setNavigationStack] = useState([]);
  const [screenOptions, setScreenOptions] = useState({});
  const [routeParams, setRouteParams] = useState(null);

  // Ref for scroll-to-top callback (pages can register their scroll handler)
  const scrollToTopRef = useRef(null);

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
  const goBack = useCallback(() => {
    if (navigationStack.length > 0) {
      const prevEntry = navigationStack[navigationStack.length - 1];
      setNavigationStack((prev) => prev.slice(0, -1));
      setCurrentRoute(prevEntry.route);
      setRouteParams(prevEntry.params || null);
      // Reset screen options so previous screen can set its own
      setScreenOptions({});
      return true;
    }
    return false;
  }, [navigationStack]);

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
    navigate,
    goBack,
    canGoBack,
    screenOptions,
    setOptions,
    registerScrollToTop,
    triggerScrollToTop,
  }), [currentRoute, routeParams, navigate, goBack, canGoBack, screenOptions, setOptions, registerScrollToTop, triggerScrollToTop]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
