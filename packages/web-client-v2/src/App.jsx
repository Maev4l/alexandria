// Edited by Claude.
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { LibrariesProvider } from '@/state';
import { Layout } from '@/navigation';
import { ToastProvider } from '@/components/Toast';
import PWAUpdatePrompt from '@/components/PWAUpdatePrompt';

// Lazy-loaded pages for code splitting
const Login = lazy(() => import('@/pages/Login'));
const SignUp = lazy(() => import('@/pages/SignUp'));
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
const AddVideo = lazy(() => import('@/pages/AddVideo'));
const VideoDetectionResults = lazy(() => import('@/pages/VideoDetectionResults'));
const NewVideo = lazy(() => import('@/pages/NewVideo'));
const EditVideo = lazy(() => import('@/pages/EditVideo'));
const VideoDetail = lazy(() => import('@/pages/VideoDetail'));
const ItemHistory = lazy(() => import('@/pages/ItemHistory'));
const Search = lazy(() => import('@/pages/Search'));
const Settings = lazy(() => import('@/pages/Settings'));
const Account = lazy(() => import('@/pages/Account'));
const About = lazy(() => import('@/pages/About'));
const PendingApproval = lazy(() => import('@/pages/PendingApproval'));

// Redirects unauthenticated users to /login, unapproved users to /pending-approval
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.approved) return <Navigate to="/pending-approval" replace />;
  return children;
};

// Route for authenticated but not yet approved users
const PendingApprovalRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // If approved, redirect to main app
  if (user?.approved) return <Navigate to="/libraries" replace />;
  return children;
};

// Redirects already-authenticated users away from /login
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/libraries" replace />;
  return children;
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <PWAUpdatePrompt />
      <Routes>
        {/* Public routes */}
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
          path="/signup"
          element={
            <PublicRoute>
              <Suspense fallback={null}>
                <SignUp />
              </Suspense>
            </PublicRoute>
          }
        />

        {/* Pending approval route */}
        <Route
          path="/pending-approval"
          element={
            <PendingApprovalRoute>
              <Suspense fallback={null}>
                <PendingApproval />
              </Suspense>
            </PendingApprovalRoute>
          }
        />

        {/* Protected routes - wrapped in Layout */}
        <Route
          element={
            <ProtectedRoute>
              <ToastProvider>
                <LibrariesProvider>
                  <Layout />
                </LibrariesProvider>
              </ToastProvider>
            </ProtectedRoute>
          }
        >
          {/* Tab screens */}
          <Route path="/libraries" element={<Libraries />} />
          <Route path="/search" element={<Search />} />
          <Route path="/settings" element={<Settings />} />

          {/* Settings stack */}
          <Route path="/settings/account" element={<Account />} />
          <Route path="/settings/about" element={<About />} />

          {/* Library management */}
          <Route path="/libraries/new" element={<NewLibrary />} />
          <Route path="/libraries/:libraryId" element={<LibraryContent />} />
          <Route path="/libraries/:libraryId/edit" element={<EditLibrary />} />
          <Route path="/libraries/:libraryId/unshare" element={<UnshareLibrary />} />

          {/* Book routes */}
          <Route path="/libraries/:libraryId/add-book" element={<AddBook />} />
          <Route path="/libraries/:libraryId/book-results" element={<BookDetectionResults />} />
          <Route path="/libraries/:libraryId/books/new" element={<NewBook />} />
          <Route path="/libraries/:libraryId/books/:itemId" element={<BookDetail />} />
          <Route path="/libraries/:libraryId/books/:itemId/edit" element={<EditBook />} />

          {/* Video routes */}
          <Route path="/libraries/:libraryId/add-video" element={<AddVideo />} />
          <Route path="/libraries/:libraryId/video-results" element={<VideoDetectionResults />} />
          <Route path="/libraries/:libraryId/videos/new" element={<NewVideo />} />
          <Route path="/libraries/:libraryId/videos/:itemId" element={<VideoDetail />} />
          <Route path="/libraries/:libraryId/videos/:itemId/edit" element={<EditVideo />} />

          {/* Item history (shared by books and videos) */}
          <Route path="/libraries/:libraryId/items/:itemId/history" element={<ItemHistory />} />

          {/* Default redirect */}
          <Route index element={<Navigate to="/libraries" replace />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/libraries" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
