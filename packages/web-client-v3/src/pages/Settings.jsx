import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';

// `onBack` is not decoration: this is the ONLY route to settings in the whole app, reached from
// the account plate on the libraries root — the screen a cold open lands on. Installed as a
// standalone PWA there is no browser chrome and no back gesture, so without it this was the
// worst of the seven dead ends to leave open.
//
// The wordmark is GONE now that the screen is real. A stub carried both marks because it had no
// title worth printing and still owed the reader an exit; a finished screen showing the wordmark
// beside a back control is announcing it has nothing to call itself.

// Two rows, and nothing else on them. A row is a destination, so it carries the destination's
// name and one line saying what is there — no chevron: this world's Marks are universal
// affordances (back, add, search, close), and a decorative arrow restating "this is a link" on
// something already announced as a link is ornament.
const SettingsRow = ({ to, label, note }) => (
  <Link to={to} className="flex min-h-12 flex-col justify-center gap-1 border-b-2 border-ink p-4">
    <span className="text-[17px] font-semibold">{label}</span>
    <span className="text-sm text-ink-soft">{note}</span>
  </Link>
);

const Settings = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  // NO CONFIRMATION. Confirmation is reserved for what is actually destructive, and signing out destroys
  // nothing — the reader signs back in and everything is where they left it. It is still not a
  // navigation row: it does something rather than going somewhere, so it is a ruled secondary
  // plate set apart from the rows, with the consequence stated beside it.
  const onSignOut = async () => {
    setError(null);
    try {
      await signOut();
      // The Gate turns a null user into /login on its own; this only makes the transition
      // immediate rather than waiting on a re-render of a screen that is already gone.
      navigate('/login', { replace: true });
    } catch {
      // Inline and in place, never a toast: a toast that failed to sign someone out is a
      // failure report the reader can miss.
      setError('Signing out did not go through. Try again.');
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <AppHeader title="Settings" onBack={() => navigate(-1)} search={false} />
      <main
        data-scroll-region
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]"
      >
        {/* The header prints the name; this is the same name for a reader who navigates by
            heading, not a second visible copy of it. */}
        <h1 className="sr-only">Settings</h1>

        {/* The note must be true on BOTH branches of the destination. It said "Your email, your id,
            your password": the id came off Account when that section was removed, and on a Google
            sign-in there is no password either — so two of three promises were false and the third
            was conditional. The removal commit touched Account, its test and two guard files, and
            not this one, so no diff-driven review could have seen it.
            `Account.test.jsx` asserts this string against the row AND against the destination, so
            the two cannot drift apart again. */}
        <SettingsRow to="/settings/account" label="Account" note="Your email and your sign-in" />
        <SettingsRow to="/settings/about" label="About" note="Which build you are running" />

        {/* Four divisions clear of the last row, because "set apart" has to be visible: at one
            division the block read as an appendix to About rather than as its own thing. */}
        <div className="p-4 pt-8">
          {error && (
            <p role="alert" className="mb-4 border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
              {error}
            </p>
          )}
          {/* Linked to the button. The state grammar rejected `aria-describedby` on a DISABLED primary because a
              disabled button is not focusable, so the description was never announced on tab —
              that objection does not apply here: this button is enabled, so a reader tabbing to it
              hears the consequence with it rather than only if they happened to read past it. */}
          <p id="sign-out-consequence" className="mb-2 text-sm text-ink-soft">
            You will need to sign in again.
          </p>
          <PlateButton variant="secondary" aria-describedby="sign-out-consequence" onClick={onSignOut}>
            Sign out
          </PlateButton>
        </div>
      </main>
    </div>
  );
};

export default Settings;
