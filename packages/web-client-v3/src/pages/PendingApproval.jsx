import PlateButton from '@/components/imprint/PlateButton.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';

// No polling: approval arrives out of band, through Slack or the admin CLI. The honest
// instruction is to come back later, not a spinner that will never resolve.
const PendingApproval = () => {
  const { signOut } = useAuth();
  return (
    <div className="pad-top-safe flex min-h-dvh flex-col bg-paper px-4 pb-8">
      {/* Ink, not `--out`. This badge used to wear the Overprint Stamp's own construction — a
          2px `--out` outline — on a screen that holds no items at all, so the one colour the
          palette reserves for circulation was marking an account state: `--out` marks a lent
          item and nothing else, ever. It is not the yellow wordmark plate either: that plate
          carries the wordmark, and `--imprint` means finding and acting. */}
      <span className="caps mt-8 inline-block self-start border-2 border-ink px-2 py-1 text-[11px] font-extrabold tracking-[0.14em] text-ink">
        Pending approval
      </span>
      {/* Not a route (App.jsx's Gate renders this in place of the router), but still a real
          screen a reader lands on, so it gets the same landmark and heading discipline. */}
      <main className="flex flex-1 flex-col">
        <h1 className="mt-4 text-[32px] font-extrabold leading-[1.06]">
          Your request is with an administrator
        </h1>
        <p className="mt-4 max-w-prose text-sm text-ink-soft">
          Alexandria is a private catalogue, so every new account is approved by hand. You will
          not be notified here — sign in again later and you will be through.
        </p>
        <PlateButton variant="secondary" className="mt-8 self-start" onClick={signOut}>
          Sign out
        </PlateButton>
      </main>
    </div>
  );
};

export default PendingApproval;
