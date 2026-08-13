import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

// Route-level code splitting. The capture routes are the reason this matters: @zxing and
// react-webcam must never be in the entry bundle for a reader who only ever looks things up.
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

const AppRoutes = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      <Route path="/libraries" element={<Libraries />} />
      <Route path="/libraries/new" element={<NewLibrary />} />
      <Route path="/libraries/:libraryId" element={<LibraryBrowse />} />
      <Route path="/libraries/:libraryId/edit" element={<EditLibrary />} />
      <Route path="/libraries/:libraryId/unshare" element={<UnshareLibrary />} />
      <Route path="/libraries/:libraryId/collections/new" element={<NewCollection />} />
      <Route
        path="/libraries/:libraryId/collections/:collectionId/edit"
        element={<EditCollection />}
      />
      <Route path="/libraries/:libraryId/add/book" element={<AddBook />} />
      <Route path="/libraries/:libraryId/add/book/results" element={<BookDetectionResults />} />
      <Route path="/libraries/:libraryId/add/video" element={<AddVideo />} />
      <Route path="/libraries/:libraryId/add/video/results" element={<VideoDetectionResults />} />
      <Route path="/libraries/:libraryId/items/new/book" element={<NewBook />} />
      <Route path="/libraries/:libraryId/items/new/video" element={<NewVideo />} />
      <Route path="/libraries/:libraryId/items/:itemId" element={<ItemDetail />} />
      <Route path="/libraries/:libraryId/items/:itemId/edit" element={<EditItem />} />
      <Route path="/libraries/:libraryId/items/:itemId/history" element={<ItemHistory />} />

      <Route path="/search" element={<Search />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/account" element={<Account />} />
      <Route path="/settings/about" element={<About />} />

      <Route path="*" element={<Navigate to="/libraries" replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
