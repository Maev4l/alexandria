import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/auth/AuthContext.jsx';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';
import PendingApproval from '@/pages/PendingApproval.jsx';
import AppRoutes from './routes.jsx';

const Gate = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-dvh bg-paper" aria-busy="true" />;
  // Not a route: a signed-in but unapproved session is a state, not a place.
  if (user && !user.approved) return <PendingApproval />;

  return (
    <LibrariesProvider>
      <AppRoutes />
    </LibrariesProvider>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Gate />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
