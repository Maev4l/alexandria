import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import { config } from '@/config.js';

const About = () => {
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
          <h2 className="caps mb-1 text-[11px] font-bold text-ink-soft">This build</h2>
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
            Quote these two marks if you report something that looks wrong — together they name
            exactly which build you were looking at, which is the only reason a private app shows
            them at all.
          </p>
        </section>
      </main>
    </div>
  );
};

export default About;
