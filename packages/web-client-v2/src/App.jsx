// Edited by Claude.
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Library, Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { LibrariesProvider } from '@/state';
import { TabNavigator } from '@/navigation';
import { ToastProvider } from '@/components/Toast';
import Login from '@/pages/Login';
import Libraries from '@/pages/Libraries';
import NewLibrary from '@/pages/NewLibrary';
import EditLibrary from '@/pages/EditLibrary';
import ShareLibrary from '@/pages/ShareLibrary';
import UnshareLibrary from '@/pages/UnshareLibrary';
import Search from '@/pages/Search';
import Settings from '@/pages/Settings';

// Tab screens (shown with bottom tabs)
const screens = [
  {
    name: 'libraries',
    label: 'Libraries',
    icon: Library,
    component: Libraries,
    options: { title: 'My Libraries' },
  },
  {
    name: 'search',
    label: 'Search',
    icon: SearchIcon,
    component: Search,
    options: { title: 'Search' },
  },
  {
    name: 'settings',
    label: 'Settings',
    icon: SlidersHorizontal,
    component: Settings,
    options: { title: 'Settings' },
  },
];

// Stack screens (pushed on top, no bottom tabs)
const stackScreens = [
  {
    name: 'newLibrary',
    component: NewLibrary,
    options: { title: 'New Library' },
  },
  {
    name: 'editLibrary',
    component: EditLibrary,
    options: { title: 'Edit Library' },
  },
  {
    name: 'shareLibrary',
    component: ShareLibrary,
    options: { title: 'Share Library' },
  },
  {
    name: 'unshareLibrary',
    component: UnshareLibrary,
    options: { title: 'Unshare Library' },
  },
];

// Redirects unauthenticated users to /login
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Redirects already-authenticated users away from /login
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ToastProvider>
                <LibrariesProvider>
                  <TabNavigator screens={screens} stackScreens={stackScreens} initialRoute="libraries" />
                </LibrariesProvider>
              </ToastProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
