// Edited by Claude.
// Layout: wrapper for authenticated routes
// Renders main content (Outlet) + BottomTabs
// AppBar is rendered by each page individually
import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Library, Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import BottomTabs from './BottomTabs';

// Tab configuration
const tabs = [
  { name: 'libraries', path: '/libraries', label: 'Libraries', icon: Library },
  { name: 'search', path: '/search', label: 'Search', icon: SearchIcon },
  { name: 'settings', path: '/settings', label: 'Settings', icon: SlidersHorizontal },
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

const Layout = () => {
  const location = useLocation();
  const showTabs = shouldShowTabs(location.pathname);

  return (
    <div className="flex min-h-svh flex-col">
      {/* Main content - pages render their own AppBar */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>

      {/* Bottom tabs */}
      {showTabs && <BottomTabs tabs={tabs} />}
    </div>
  );
};

export default Layout;
