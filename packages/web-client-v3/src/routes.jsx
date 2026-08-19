import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AddFlowLayout from '@/components/AddFlowLayout.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';

// Route-level code splitting. The capture routes are the reason this matters: @zxing must
// never be in the entry bundle for a reader who only ever looks things up. (react-webcam used to
// be named here too; the cover capture is a plain <video> now — see CoverCapture.jsx.)
const Login = lazy(() => import('@/pages/Login.jsx'));
const SignUp = lazy(() => import('@/pages/SignUp.jsx'));
const Libraries = lazy(() => import('@/pages/Libraries.jsx'));
const NewLibrary = lazy(() => import('@/pages/NewLibrary.jsx'));
const EditLibrary = lazy(() => import('@/pages/EditLibrary.jsx'));
const UnshareLibrary = lazy(() => import('@/pages/UnshareLibrary.jsx'));
const LibraryBrowse = lazy(() => import('@/pages/LibraryBrowse.jsx'));
const NewCollection = lazy(() => import('@/pages/NewCollection.jsx'));
const EditCollection = lazy(() => import('@/pages/EditCollection.jsx'));
const AddBook = lazy(() => import('@/pages/AddBook.jsx'));
const BookDetectionResults = lazy(() => import('@/pages/BookDetectionResults.jsx'));
const AddVideo = lazy(() => import('@/pages/AddVideo.jsx'));
const VideoDetectionResults = lazy(() => import('@/pages/VideoDetectionResults.jsx'));
const NewBook = lazy(() => import('@/pages/NewBook.jsx'));
const NewVideo = lazy(() => import('@/pages/NewVideo.jsx'));
const ItemDetail = lazy(() => import('@/pages/ItemDetail.jsx'));
const EditItem = lazy(() => import('@/pages/EditItem.jsx'));
const ItemHistory = lazy(() => import('@/pages/ItemHistory.jsx'));
const Search = lazy(() => import('@/pages/Search.jsx'));
const Settings = lazy(() => import('@/pages/Settings.jsx'));
const Account = lazy(() => import('@/pages/Account.jsx'));
const About = lazy(() => import('@/pages/About.jsx'));

// The ground, at full height, so the layout does not jump when the route lands.
const RouteFallback = () => <div className="min-h-dvh bg-paper" aria-busy="true" />;

// Sends an unauthenticated visitor to /login while remembering where they were headed, so a
// hard token expiry costs them the session but not their place.
const RequireAuth = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
};

const guard = (element) => <RequireAuth>{element}</RequireAuth>;

const AppRoutes = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      <Route path="/libraries" element={guard(<Libraries />)} />
      <Route path="/libraries/new" element={guard(<NewLibrary />)} />
      <Route path="/libraries/:libraryId" element={guard(<LibraryBrowse />)} />
      <Route path="/libraries/:libraryId/edit" element={guard(<EditLibrary />)} />
      <Route path="/libraries/:libraryId/unshare" element={guard(<UnshareLibrary />)} />
      <Route path="/libraries/:libraryId/collections/new" element={guard(<NewCollection />)} />
      <Route
        path="/libraries/:libraryId/collections/:collectionId/edit"
        element={guard(<EditCollection />)}
      />
      {/* A LAYOUT route, not a path segment: it renders only an <Outlet/>, so these four keep
          the exact URLs they had. Its job is to stay mounted for the whole cataloguing session —
          across capture -> results -> capture, however many items — and to unmount, resetting the
          tally, the moment the reader leaves the flow. Nesting is what defines "this session";
          see FilingSessionContext.jsx. It owns the camera lease on the same span, for the same
          reason — see AddFlowLayout.jsx. */}
      <Route element={<AddFlowLayout />}>
        <Route path="/libraries/:libraryId/add/book" element={guard(<AddBook />)} />
        <Route path="/libraries/:libraryId/add/book/results" element={guard(<BookDetectionResults />)} />
        <Route path="/libraries/:libraryId/add/video" element={guard(<AddVideo />)} />
        <Route path="/libraries/:libraryId/add/video/results" element={guard(<VideoDetectionResults />)} />
      </Route>
      <Route path="/libraries/:libraryId/items/new/book" element={guard(<NewBook />)} />
      <Route path="/libraries/:libraryId/items/new/video" element={guard(<NewVideo />)} />
      <Route path="/libraries/:libraryId/items/:itemId" element={guard(<ItemDetail />)} />
      <Route path="/libraries/:libraryId/items/:itemId/edit" element={guard(<EditItem />)} />
      <Route path="/libraries/:libraryId/items/:itemId/history" element={guard(<ItemHistory />)} />

      <Route path="/search" element={guard(<Search />)} />
      <Route path="/settings" element={guard(<Settings />)} />
      <Route path="/settings/account" element={guard(<Account />)} />
      <Route path="/settings/about" element={guard(<About />)} />

      <Route path="*" element={<Navigate to="/libraries" replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
