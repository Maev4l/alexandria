import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { usePWA } from '@/pwa/PWAContext.jsx';
import { config } from '@/config.js';

const About = () => {
  const { needRefresh, checkForUpdate, checkState } = usePWA();
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader title="About" onBack={() => navigate(-1)} search={false} />
      <main className="p-4">
        <h1 className="sr-only">About</h1>

        <p className="text-sm">
          Alexandria is a private catalogue of one household&apos;s books and films — what is
          owned, where it is shelved, and who currently has it.
        </p>

        <section className="mt-6 border-t-2 border-ink pt-4">
          <h2 className="caps mb-1 text-[11px] font-extrabold text-ink-soft">This build</h2>
          <p className="text-sm text-ink">
            {/* The VERSION is a numeral and takes the mono (DESIGN.md §3); the commit hash sits
                beside it in the sans, because a short hash is hexadecimal — mostly letters —
                and the mono is reserved for numerals. Setting it in the mono would also make
                scripts/check-browser.mjs's digit-dominance check depend on which commit is
                checked out: roughly one hash in six is under half digits, so the guard would go
                red for a reason that has nothing to do with the app. */}
            <span className="num">{config.appVersion}</span>
            <span className="text-ink-soft"> · </span>
            <span>{config.buildHash}</span>
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            Quote these two marks if you report something that looks wrong — together they
          name exactly which build you were looking at.
          </p>

        {/* A MANUAL CHECK, because an automatic prompt that has nothing to announce and a broken
            one look identical from outside. Reported from the deployed app as the prompt being
            "missing" — it was not: there was no newer build to offer, and nothing said so. A
            reader cannot tell "you are current" from "the update mechanism is dead" without a
            control that answers, which is why v2 has one and why this is not merely a
            convenience.
            The app also checks hourly and whenever the reader returns to it (PWAContext), so this
            is a way to ASK rather than the only way to find out. */}
        <PlateButton
          variant="secondary"
          className="mt-6"
          disabled={checkState === 'checking'}
          reason="A check is already running."
          onClick={checkForUpdate}
        >
          {checkState === 'checking' ? 'Checking' : 'Check for a new edition'}
        </PlateButton>

        {/* The outcome, in words. `current` is the ordinary answer and the one that most needs
            saying: silence after a check is what made the mechanism look broken. A new build
            needs nothing here — the notice appears on its own, which is the whole point of it. */}
        {checkState === 'current' && !needRefresh && (
          <p role="status" className="mt-2 text-sm text-ink-soft">
            You are on the newest edition.
          </p>
        )}
        {checkState === 'failed' && (
          <p role="status" className="mt-2 text-sm text-ink-soft">
            The check could not run. It needs a connection, and it does not work on a page opened
            from a local build.
          </p>
        )}
        </section>
      </main>
    </div>
  );
};

export default About;
