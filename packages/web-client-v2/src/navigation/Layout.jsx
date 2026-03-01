// Edited by Claude.
// Layout: wrapper for authenticated routes
// Renders main content (Outlet) + floating BottomTabs
// Directional slide animations for tab switches
import { Suspense, useRef, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Library, Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import BottomTabs from './BottomTabs';

// Tab configuration with order for animation direction
const tabs = [
  { name: 'libraries', path: '/libraries', label: 'Libraries', icon: Library, order: 0 },
  { name: 'search', path: '/search', label: 'Search', icon: SearchIcon, order: 1 },
  { name: 'settings', path: '/settings', label: 'Settings', icon: SlidersHorizontal, order: 2 },
];

// Routes where we should show bottom tabs
const SHOW_TABS_PATTERNS = [
  /^\/libraries$/,        // Libraries tab
  /^\/search$/,           // Search tab
  /^\/settings$/,         // Settings tab
  /^\/libraries\/[^/]+$/, // LibraryContent (single library view)
];

const shouldShowTabs = (pathname) => {
  return SHOW_TABS_PATTERNS.some((pattern) => pattern.test(pathname));
};

// Get tab order for a pathname (-1 if not a tab)
const getTabOrder = (pathname) => {
  const tab = tabs.find((t) => t.path === pathname);
  return tab?.order ?? -1;
};

const Layout = () => {
  const location = useLocation();
  const showTabs = shouldShowTabs(location.pathname);
  const prevPathRef = useRef(location.pathname);

  // Determine animation class based on navigation direction
  const animationClass = useMemo(() => {
    const currentOrder = getTabOrder(location.pathname);
    const prevOrder = getTabOrder(prevPathRef.current);

    // Update ref for next comparison
    const prevPath = prevPathRef.current;
    prevPathRef.current = location.pathname;

    // If both are tabs, use directional slide
    if (currentOrder >= 0 && prevOrder >= 0 && currentOrder !== prevOrder) {
      return currentOrder > prevOrder
        ? 'animate-slide-from-right'
        : 'animate-slide-from-left';
    }

    // Default: simple fade
    return 'animate-page-enter';
  }, [location.pathname]);

  return (
    <div className="flex min-h-svh flex-col">
      {/* Main content - pages render their own AppBar */}
      {/* Key by pathname triggers animation on route change */}
      {/* z-[51] ensures action sheets (z-60) inside main appear above BottomTabs (z-50) */}
      <main
        key={location.pathname}
        className={`flex-1 flex flex-col overflow-hidden z-[51] ${animationClass}`}
      >
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>

      {/* Floating bottom tabs */}
      {showTabs && <BottomTabs tabs={tabs} />}
    </div>
  );
};

export default Layout;
