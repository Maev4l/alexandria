// Edited by Claude.
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Library, Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { LibrariesProvider } from '@/state';
import { TabNavigator } from '@/navigation';
import { ToastProvider } from '@/components/Toast';
import PWAUpdatePrompt from '@/components/PWAUpdatePrompt';

// Lazy-loaded pages for code splitting
const Login = lazy(() => import('@/pages/Login'));
const Libraries = lazy(() => import('@/pages/Libraries'));
const NewLibrary = lazy(() => import('@/pages/NewLibrary'));
const EditLibrary = lazy(() => import('@/pages/EditLibrary'));
const UnshareLibrary = lazy(() => import('@/pages/UnshareLibrary'));
const LibraryContent = lazy(() => import('@/pages/LibraryContent'));
const AddBook = lazy(() => import('@/pages/AddBook'));
const BookDetectionResults = lazy(() => import('@/pages/BookDetectionResults'));
const NewBook = lazy(() => import('@/pages/NewBook'));
const EditBook = lazy(() => import('@/pages/EditBook'));
const BookDetail = lazy(() => import('@/pages/BookDetail'));
const ItemHistory = lazy(() => import('@/pages/ItemHistory'));
const Search = lazy(() => import('@/pages/Search'));
const Settings = lazy(() => import('@/pages/Settings'));
const Account = lazy(() => import('@/pages/Account'));
const About = lazy(() => import('@/pages/About'));

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
    name: 'unshareLibrary',
    component: UnshareLibrary,
    options: { title: 'Unshare Library' },
  },
  {
    name: 'libraryContent',
    component: LibraryContent,
    options: { title: 'Library', showTabs: true },
  },
  {
    name: 'addBook',
    component: AddBook,
    options: { title: 'Add Book' },
  },
  {
    name: 'bookDetectionResults',
    component: BookDetectionResults,
    options: { title: 'Select Book' },
  },
  {
    name: 'newBook',
    component: NewBook,
    options: { title: 'New Book' },
  },
  {
    name: 'editBook',
    component: EditBook,
    options: { title: 'Edit Book' },
  },
  {
    name: 'bookDetail',
    component: BookDetail,
    options: { title: 'Book' },
  },
  {
    name: 'itemHistory',
    component: ItemHistory,
    options: { title: 'History' },
  },
  {
    name: 'account',
    component: Account,
    options: { title: 'Account' },
  },
  {
    name: 'about',
    component: About,
    options: { title: 'About' },
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
      <PWAUpdatePrompt />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Suspense fallback={null}>
                <Login />
              </Suspense>
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
