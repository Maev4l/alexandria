import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { Copy } from '@/components/icons/index.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { useToast } from '@/state/ToastContext.jsx';
import { passwordIssues } from '@/lib/password.js';

// FEDERATED IS READ OFF THE USERNAME PREFIX, and the obvious alternative is wrong in exactly the
// case this pool creates on purpose. Cognito's linking matrix (authn-scheme.md) links a Google
// sign-in onto an existing native account, so a reader who signed up with a PASSWORD and later
// signed in with Google has an `identities` entry and a password — gating the form on
// `identities` would hide a password form from someone who has one and may need to change it.
//
// The prefix means something narrower and stronger: Cognito mints `google_<sub>` only for a user
// CREATED by the external provider, which is precisely the user with no password in the pool. A
// linked account keeps its original native username. So prefix present <=> no password, which is
// the actual question this screen asks.
//
// WHAT WOULD FALSIFY IT, stated so it is checkable rather than trusted: a federated user whose
// `getCurrentUser().username` carries no provider prefix. The prefix is not decoration — the
// user-onboarding Lambda's own provider normalisation is keyed on it — so account linking would
// break if it were absent.
// `google_` SPECIFICALLY, not a generic `<provider>_` pattern. Google is the only external
// provider this pool has (cognito.tf), and a loose prefix match would fire on a native username
// too — a Cognito username IS the reader's email address for a native signup, and
// `john_doe@example.com` matches `^[a-z]+_`. That would hide the password form from a reader
// who has one, which is the exact defect the `identities` test was rejected for. Another
// provider means another literal here, deliberately.
const isFederated = (username = '') => username.toLowerCase().startsWith('google_');

const Account = () => {
  const { user, changePassword } = useAuth();
  const { confirm } = useToast();
  const navigate = useNavigate();

  const [copyError, setCopyError] = useState(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const federated = isFederated(user?.username ?? '');
  const issues = passwordIssues(next);
  const canSubmit = current.length > 0 && issues.length === 0;

  const onCopy = async () => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(user.email);
      confirm('Your email address is copied.');
    } catch {
      // A toast carries confirmations only. A copy that did not happen is a failure, so it is
      // reported in place, beside the value the reader can still select by hand.
      setCopyError('Copying is not available here. Select the address above and copy it by hand.');
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsBusy(true);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      confirm('Your password is changed.');
    } catch (err) {
      // Named causes, and a next action. Cognito's own wording is never passed through: a
      // server's status word describes the request, not the reader.
      if (err?.name === 'NotAuthorizedException') {
        setError('That current password is not right. Try it again.');
      } else if (err?.name === 'LimitExceededException') {
        setError('Too many attempts. Wait a few minutes, then try again.');
      } else if (err?.name === 'InvalidPasswordException') {
        // Names NO cause. "Try a longer one" points at the one rule the form already enforces,
        // so it is the least likely explanation — and `password.js`'s `/[^A-Za-z0-9]/` counts an
        // accented letter as a symbol, so `Abcdefgé1` reads "meets every requirement" here while
        // Cognito's symbol set is ASCII. That is a real route to this error on a half-French
        // catalogue. NOT asserted as the cause: neither this session nor the design session has
        // tested that behaviour against the live pool, and naming an unverified reason is how the
        // session-revocation sentence nearly shipped.
        setError('The sign-in pool would not accept that password. Try a different one.');
      } else {
        setError('Your password could not be changed. Try again.');
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader title="Account" onBack={() => navigate(-1)} search={false} />
      <main className="p-4">
        <h1 className="sr-only">Account</h1>

        {/* The rule closes the BLOCK, so everything belonging to the address lives above it.
            The caption used to sit outside, which put the heaviest separator on the screen between
            the email and the only sentence saying what it is for. */}
        <div className="border-b-2 border-ink pb-4">
          <div className="flex items-center gap-4">
          {/* The email sits beside it in the same block, so the plate states nothing a reader
              would otherwise miss — it is the imprint's mark, not information. */}
          <span
            aria-hidden="true"
            className="caps on-imprint flex size-12 shrink-0 items-center justify-center bg-imprint text-[11px] font-extrabold text-ink"
          >
            {user?.initials ?? '—'}
          </span>
          {/* The EMAIL from the JWT, never the Cognito username: for a Google sign-in that
              username is `google_<sub>`, an internal string the reader has never seen.
              NOT interactive as a row. Copying is a Mark beside it, so the address itself stays
              selectable text — which is what the failure path below falls back to when the
              clipboard is unavailable. */}
          <span className="min-w-0 break-all text-[17px] font-semibold">{user?.email}</span>
          {/* A MARK, not a labelled button: copy belongs to DESIGN.md §5's universal-affordance
              family beside back, add, search and close, and the caption below says what it is
              for. Negative-margined to the 48px floor so it does not inflate the row — the same
              construction Row Actions and the password reveal already use. The `aria-label` is
              this control's only name (§8), so it names what it copies rather than the verb. */}
          <button
            type="button"
            aria-label="Copy your email address"
            onClick={onCopy}
            className="-my-2 flex size-12 shrink-0 items-center justify-center text-ink"
          >
            <Copy />
          </button>
          </div>

          {/* Sharing is by email — `POST /libraries/{libraryId}/share` takes an address — so this
              is what the reader gives to someone who wants to share a library WITH them. It is the
              only reason this screen has a copy control at all. */}
          <p className="mt-2 text-sm text-ink-soft">
            Give this to someone so they can share a library with you.
          </p>

          {copyError && (
            <p role="alert" className="mt-2 border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
              {copyError}
            </p>
          )}
        </div>


        {federated ? (
          // ABSENT, not disabled: a Google account has no password in this pool, so a form
          // offering to change one offers something impossible. Unlike a shared library — where
          // the `FROM` tag beside the missing actions explains itself — nothing else on this
          // screen would say why, so the absence gets a sentence.
          <section className="py-4">
            <h2 className="caps mb-1 text-[11px] font-extrabold tracking-[0.16em] text-ink-soft">Password</h2>
            <p className="text-sm text-ink-soft">
              Your sign-in is managed by Google, so there is no password here to change.
            </p>
          </section>
        ) : (
          <section className="py-4">
            <h2 className="caps mb-4 text-[11px] font-extrabold tracking-[0.16em] text-ink-soft">Change your password</h2>
            {error && (
              <p role="alert" className="mb-6 border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
                {error}
              </p>
            )}
            {/* noValidate, as on every form in this app: `required` is what speaks to a screen
                reader, and the browser's own validation bubble is chrome this world has no
                vocabulary for. */}
            <form onSubmit={onSubmit} noValidate>
              {/* A USERNAME FIELD A PASSWORD MANAGER CAN SEE. Chrome warns on every load without
                  one, and the consequence is worse than the warning: a manager that cannot match
                  the change often keeps the OLD value. The reader succeeds, the app confirms, and
                  the stored credential is silently stale — surfacing at the next sign-in, which on
                  a 365-day refresh token can be a year away, with nothing linking the two events.
                  Off-screen rather than `display: none`, because managers commonly ignore hidden
                  fields; `readOnly` and `tabIndex={-1}` keep it out of the reader's way while
                  leaving it present to the manager. */}
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={user?.email ?? ''}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only"
              />
              <Field
                label="Current password"
                type="password"
                autoComplete="current-password"
                required
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
              <Field
                label="New password"
                type="password"
                autoComplete="new-password"
                required
                value={next}
                onChange={(e) => setNext(e.target.value)}
                // Name what is missing while they type, rather than rejecting on submit.
                // The hint is the only signal that the rules are met, and it changes as the
                // reader types — so the qualifying moment is announced rather than left to be
                // discovered by re-reading. See Field's `liveHint` for why this is opt-in.
                liveHint
                hint={issues.length > 0 ? `Needs ${issues.join(', ')}` : 'Meets every requirement'}
              />
              <PlateButton
                type="submit"
                disabled={isBusy || !canSubmit}
                reason="Enter your current password, and a new one that meets every rule above."
              >
                {isBusy ? 'Changing' : 'Change password'}
              </PlateButton>
            </form>
          </section>
        )}
      </main>
    </div>
  );
};

export default Account;
