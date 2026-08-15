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

  const shell = (
    <ToastProvider>
      <Column>
        <AppRoutes />
      </Column>
    </ToastProvider>
  );

  // NO PROVIDER WHILE SIGNED OUT. This branch did not exist, and its absence is what a second
  // reader actually experienced: LibrariesProvider mounts ABOVE the router, so its effect ran on
  // every signed-out page load and fetched libraries with no session. RequireAuth redirects the
  // ROUTE to /login, but it cannot unmount a provider above it. Her first ever page load fired
  // GET /libraries fifteen seconds before she signed in, and the failure it stored was still on
  // screen once she had. A signed-out session has no libraries and no business asking for any.
  if (!user) return shell;

  // KEYED BY IDENTITY. Fixing the fetch alone would leave the class of defect intact: state
  // raised under one identity must never survive into another, and nothing about navigating
  // clears a provider mounted above the router. The key makes that structural rather than a
  // consequence of the branch above happening to unmount first.
  return (
    <LibrariesProvider key={user.id}>{shell}</LibrariesProvider>
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
