// Edited by Claude.
// TabNavigator: declarative tab-based navigation container
// Supports both tab screens (with bottom tabs) and stack screens (pushed on top)
// Keeps stacked screens mounted to preserve scroll position and state
import { useMemo } from 'react';
import { NavigationProvider, useNavigation, ScreenParamsProvider } from './NavigationContext';
import AppBar from './AppBar';
import BottomTabs from './BottomTabs';

// Helper to find screen config by route name
const findScreen = (screens, stackScreens, routeName) => {
  return stackScreens.find((s) => s.name === routeName) ||
         screens.find((s) => s.name === routeName);
};

// Internal component that renders current screen
const TabContent = ({ screens, stackScreens = [] }) => {
  const { currentRoute, navigationStack, screenOptions, canGoBack } = useNavigation();

  // Check if current route is a stack screen (no tabs)
  const stackScreen = useMemo(() => {
    return stackScreens.find((s) => s.name === currentRoute);
  }, [stackScreens, currentRoute]);

  // Check if current route is a tab screen
  const tabScreen = useMemo(() => {
    return screens.find((s) => s.name === currentRoute);
  }, [screens, currentRoute]);

  const currentScreen = stackScreen || tabScreen;
  if (!currentScreen) return null;

  const title = screenOptions.title ?? currentScreen.options?.title ?? currentScreen.label;
  const isStackScreen = !!stackScreen;
  // Show tabs for tab screens, or stack screens with showTabs: true
  const shouldShowTabs = !isStackScreen || stackScreen?.options?.showTabs;

  // Build list of all screens to render (stacked screens + current)
  // Each screen in the stack stays mounted to preserve scroll position
  // Use stable keys based on stack depth to prevent remounting when transitioning
  const screensToRender = useMemo(() => {
    const result = [];

    // Add all screens from the navigation stack (these will be hidden)
    navigationStack.forEach((entry, index) => {
      const screenConfig = findScreen(screens, stackScreens, entry.route);
      if (screenConfig) {
        result.push({
          key: `screen-${index}`,
          route: entry.route,
          params: entry.params,
          config: screenConfig,
          isActive: false,
        });
      }
    });

    // Add current screen at the top of the stack (this will be visible)
    result.push({
      key: `screen-${navigationStack.length}`,
      route: currentRoute,
      params: null, // Current params come from context
      config: currentScreen,
      isActive: true,
    });

    return result;
  }, [navigationStack, currentRoute, currentScreen, screens, stackScreens]);

  return (
    <div className="flex min-h-svh flex-col">
      <AppBar
        title={title}
        headerLeft={screenOptions.headerLeft}
        headerRight={screenOptions.headerRight}
        showBackButton={isStackScreen ? true : (screenOptions.showBackButton ?? canGoBack)}
      />

      {/* Main content area - render all stacked screens to preserve state */}
      {/* All screens wrapped with ScreenParamsProvider for consistent tree structure */}
      <main className="flex-1 overflow-hidden relative">
        {screensToRender.map(({ key, params, config, isActive }) => {
          const Component = config.component;
          // Active screen: undefined falls through to context.params
          // Inactive screen: use stored params from navigation stack
          const screenParams = isActive ? undefined : params;
          return (
            <div
              key={key}
              className="absolute inset-0"
              style={{ display: isActive ? 'block' : 'none' }}
            >
              <ScreenParamsProvider params={screenParams}>
                <Component />
              </ScreenParamsProvider>
            </div>
          );
        })}
      </main>

      {/* Show tabs for tab screens or stack screens with showTabs option */}
      {shouldShowTabs && (
        <BottomTabs
          tabs={screens.map((s) => ({
            name: s.name,
            label: s.label,
            icon: s.icon,
          }))}
        />
      )}
    </div>
  );
};

// Main TabNavigator: wraps everything in NavigationProvider
const TabNavigator = ({ screens, stackScreens, initialRoute }) => {
  // Default to first screen if no initial route
  const defaultRoute = initialRoute ?? screens[0]?.name;

  return (
    <NavigationProvider initialRoute={defaultRoute}>
      <TabContent screens={screens} stackScreens={stackScreens} />
    </NavigationProvider>
  );
};

export default TabNavigator;
