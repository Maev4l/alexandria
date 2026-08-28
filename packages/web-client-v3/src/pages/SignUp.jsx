import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { passwordIssues } from '@/lib/password.js';

const EXISTS = /already exists/i;

const SignUp = () => {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const navigate = useNavigate();

  const issues = passwordIssues(password);
  const canSubmit = email.trim() && name.trim() && issues.length === 0;

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsBusy(true);
    try {
      await signUp(email, password, name);
      navigate('/login', {
        state: {
          notice:
            'Account created. An administrator has to approve it before you can sign in — try again later.',
        },
      });
    } catch (err) {
      // Both UsernameExistsException and the PreSignUp trigger's "user already exists" mean
      // the same thing to the reader, so they get the same sentence.
      setError(
        err?.name === 'UsernameExistsException' || EXISTS.test(err?.message ?? '')
          ? 'An account with this email already exists. Sign in instead.'
          : (err?.message ?? 'Sign-up failed. Try again.'),
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="pad-top-safe flex h-dvh flex-col bg-paper px-4">
      <span className="caps on-imprint mt-8 inline-block bg-imprint px-2 py-1 text-xs font-extrabold tracking-[0.2em] text-ink">
        Alexandria
      </span>
      {/* This screen carries no separate header component, so <main> wraps everything below
          the wordmark badge rather than a nested subset of it. */}
      <main
        data-scroll-region
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(2rem,env(safe-area-inset-bottom))]"
      >
        <h1 className="mb-8 mt-4 text-[32px] font-extrabold leading-[1.06]">Create an account</h1>

        {error && (
          <p role="alert" className="mb-6 border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
            {error}
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
            label="Display name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Field
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            // Name what is missing while they type, rather than rejecting on submit.
            hint={issues.length > 0 ? `Needs ${issues.join(', ')}` : 'Meets every requirement'}
          />
          <PlateButton
            type="submit"
            disabled={isBusy || !canSubmit}
            reason="Fill in your email, a display name, and a password that meets every rule above."
            className="w-full"
          >
            {isBusy ? 'Creating' : 'Create account'}
          </PlateButton>
        </form>

        <p className="mt-8 text-sm">
          Already have one?{' '}
          <Link to="/login" className="font-bold underline">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
};

export default SignUp;
