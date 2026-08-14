import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/auth/AuthContext.jsx';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';
import { ToastProvider } from '@/state/ToastContext.jsx';
import PendingApproval from '@/pages/PendingApproval.jsx';
import AppRoutes from './routes.jsx';

// The whole desktop provision, deliberately: constrain the column to 56 divisions (448px) and
// centre it. Not a second layout and not a breakpoint — PRODUCT.md fixes this as a phone-first
// app where tablet and desktop must be sane, not bespoke. Unconstrained, a 1440px window drags
// a row's count plate and its actions affordance to opposite ends of the viewport.
const Column = ({ children }) => <div className="mx-auto w-full max-w-md">{children}</div>;

const Gate = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-dvh bg-paper" aria-busy="true" />;
  // Not a route: a signed-in but unapproved session is a state, not a place.
  if (user && !user.approved) {
    return (
      <Column>
        <PendingApproval />
      </Column>
    );
  }

  return (
    <LibrariesProvider>
      <ToastProvider>
        <Column>
          <AppRoutes />
        </Column>
      </ToastProvider>
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
