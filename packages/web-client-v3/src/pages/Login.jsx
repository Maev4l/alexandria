import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';

// Cognito's exception names, translated into a cause and a next action. A generic "sign-in
// failed" would leave a pending-approval reader retrying a password that is already correct.
const MESSAGES = {
  UserNotConfirmedException:
    'Your account is pending approval. An administrator has to approve it before you can sign in.',
  NotAuthorizedException: 'That email or password is not right.',
  UserNotFoundException: 'That email or password is not right.',
};

const Login = () => {
  const { signIn, signInWithGoogle, oauthMessage } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const notice = location.state?.notice;

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsBusy(true);
    try {
      await signIn(email, password);
      // Return the reader where they were headed, not always to the root.
      navigate(location.state?.from?.pathname ?? '/libraries', { replace: true });
    } catch (err) {
      setError(MESSAGES[err?.name] ?? err?.message ?? 'Sign-in failed. Try again.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="pad-top-safe min-h-dvh bg-paper px-4 pb-8">
      <span className="caps on-imprint mt-8 inline-block bg-imprint px-2 py-1 text-[11px] font-extrabold tracking-[0.16em] text-ink">
        Alexandria
      </span>
      {/* This screen carries no separate header component, so <main> wraps everything below
          the wordmark badge rather than a nested subset of it. */}
      <main>
        <h1 className="mb-8 mt-4 text-[32px] font-extrabold leading-[1.06]">Sign in</h1>

        {(oauthMessage?.type === 'success' || notice) && (
          <p role="status" className="mb-6 border-t-2 border-imprint bg-paper-deep p-4 text-sm text-ink">
            {oauthMessage?.type === 'success' ? oauthMessage.text : notice}
          </p>
        )}

        {(error || oauthMessage?.type === 'error') && (
          <p role="alert" className="mb-6 border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
            {error ?? oauthMessage.text}
          </p>
        )}

        <form onSubmit={onSubmit} noValidate>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PlateButton type="submit" disabled={isBusy} className="w-full">
            {isBusy ? 'Signing in' : 'Sign in'}
          </PlateButton>
        </form>

        <PlateButton variant="secondary" className="mt-4 w-full" onClick={signInWithGoogle}>
          Continue with Google
        </PlateButton>

        <p className="mt-8 text-sm">
          No account yet?{' '}
          {/* 48px floor (last site under it, DESIGN.md §4/§8): measured 72.6x15 in real Chrome.
              This reads as a sentence but is not the WCAG 2.5.5 "inline text" case that
              exemption targets — that exception is for a link occurring incidentally inside a
              block of prose written to be read for its own content (an article paragraph). Here
              "No account yet?" carries no information on its own; it exists only to motivate
              the tap, and "Create one" is the entire actionable payload of the line, the same
              way ItemDetail's "Full record" was judged a standalone control rather than prose
              despite also reading as a short sentence. Same `::before` hit-box technique as the
              five earlier sites (DetailMarks, LibraryRow, ItemDetail): a static negative margin
              cannot apply to an inline element at all, so the alternative was never on the
              table here. Symmetric `-inset-y-5` (-20px), the same value ItemDetail's "Full
              record" needed once `-inset-y-4` measured 0.6px short of the floor: measured
              clearance above (to "Continue with Google", `mt-4`/`mb-8` apart) is 34px, so 20px
              leaves 14px still clear of it; below is open page padding, with room to spare. */}
          <Link
            to="/signup"
            className="relative font-bold underline before:absolute before:inset-x-0 before:-inset-y-5 before:content-['']"
          >
            Create one
          </Link>
        </p>
      </main>
    </div>
  );
};

export default Login;
