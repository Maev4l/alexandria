import FilingInto from '@/components/imprint/FilingInto.jsx';

// The two facts a cataloguing session needs printed on every screen it touches: WHERE the next
// item is being filed, and HOW MANY have gone in already. They share one row because they are one
// thought — the state of the session in progress — and because either can be absent: a standalone
// session has no collection, and the first item of any session has no tally. The row itself is
// absent when both are, so a screen with neither carries no dead margin.
//
// The tally exists because filing was, until this component, COMPLETELY silent: the POST
// succeeded, the app replaced back to the capture screen, and the DOM was textually identical to
// a fresh arrival. A toast now says "that one went in" (each results screen's `onConfirm`), but a
// toast auto-dismisses after four seconds and answers only the last item. At item ten, the
// question is "where did I get to?", and only an accumulating mark answers that.
//
// `count` comes from `FilingSessionContext`, a layout route above the whole add flow — see that
// file for why neither `location.state` nor `sessionStorage` was the right home for it.
const FlowMarks = ({ collectionName, filedCount = 0 }) => {
  if (!collectionName && filedCount < 1) return null;
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <FilingInto name={collectionName} />
      {filedCount > 0 && (
        // Caps for the label, mono for the figure — the mono/caps split — and this figure is a
        // labelled datum (a count on display) rather than a numeral inside a sentence, so it takes the
        // mono exactly as a library's item count does. Same 11px caps register as FilingInto's
        // own label, because the two marks are peers on this row and neither outranks the other.
        <p className="caps text-[11px] font-bold tracking-[0.16em] text-ink-soft">
          Filed this session ·{' '}
          <span data-mark="session-tally" className="num tracking-normal">
            {filedCount}
          </span>
        </p>
      )}
    </div>
  );
};

export default FlowMarks;
