import PlateButton from '@/components/imprint/PlateButton.jsx';

// The surface for a waiting service worker.
//
// NOT A TOAST, deliberately. A toast carries a confirmation and auto-dismisses; this is a
// persistent, actionable notice that must survive being ignored — the reader may be mid-task,
// and the offer has to still be there when they are not. It is a printed notice in the imprint's
// vocabulary: recessed ground, a 3px ink rule along its top edge, a caps label, one plate action.
//
// It says NEW EDITION rather than "a new version is available". An imprint issues editions, and
// the reader is being told a newer printing of the same work exists — which is also the plainer
// sentence.
const UpdateNotice = ({ onApply }) => (
  <div
    // `status` rather than `alert`: an available update is not an emergency and must not
    // interrupt a screen reader mid-sentence. `aria-live="polite"` follows from the role.
    role="status"
    className="pad-bottom-safe fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md border-t-[3px] border-ink bg-paper-deep p-4"
  >
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="caps text-[10px] font-extrabold tracking-[0.16em] text-ink-soft">
          New edition
        </p>
        <p className="mt-1 text-sm text-ink">A newer printing of Alexandria is ready.</p>
      </div>
      {/* The only action. There is no dismiss: a reader who ignores this keeps using the edition
          they have, which is the same outcome a dismiss button would produce, without teaching
          them that the notice can be made to go away permanently. */}
      <PlateButton onClick={onApply}>Reload</PlateButton>
    </div>
  </div>
);

export default UpdateNotice;
