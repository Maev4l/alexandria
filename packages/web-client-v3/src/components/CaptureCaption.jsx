// The ONE caption construction both capture viewports use, and the reason it is a component
// rather than five copies of a class string.
//
// As shipped, every one of those five instances set a foreground and NO ground: `--ink-soft`
// caps, transparent, `absolute inset-0`, over a live camera feed. Measured against the feed,
// the same string ran between 1.45:1 and 5.1:1 depending on what the camera happened to be
// pointing at — legible and illegible within one render, at a contrast the design cannot
// predict because it does not own the pixels underneath.
//
// That is the ground-and-foreground law read in the direction nobody checks: "a ground's text is
// coloured at or below it" was written for a surface painting its own background. Here nothing set a
// ground at all, which is the same defect arriving from the other side — and the injected
// contrast detector reported nothing, because transparency over a <video> gives it no ground to
// compute against. Only measurement finds this class of failure.
//
// Two of the five mattered more than their severity band suggests. `CODE READ · LOOKING IT UP`
// is the ONLY acknowledgement that an automatic decode fired — the scanning loop's most
// important feedback. And `FRAME THE TITLE` sits permanently over the exact region the title has
// to occupy, which is an instruction printed on top of its own target.
//
// So: a printed plate — ink on paper, both set here, in one rule — pinned to the frame's BOTTOM
// EDGE as a full-width strip rather than centred over the feed. It cannot occlude what the reader
// is aiming at, and it reads at 18.18:1 regardless of what the camera sees.
const CaptureCaption = ({ children }) => (
  <p
    aria-live="polite"
    className="caps absolute inset-x-0 bottom-0 bg-paper px-4 py-2 text-center text-[11px] font-bold text-ink"
  >
    {children}
  </p>
);

export default CaptureCaption;
