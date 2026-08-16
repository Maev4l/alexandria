import IndexLetter from '@/components/imprint/IndexLetter.jsx';

// Dev-only harness for scripts/check-index-letter.mjs. Renders the REAL, unmodified
// IndexLetter component for a fixed set of glyphs, through the app's own Vite/Tailwind/font
// pipeline — this is what makes the guard trustworthy: a hand-rolled recreation of the same
// CSS declarations measured a glyph ~15% wider than this app ever renders, because it dropped
// "system-ui" from the font-family fallback chain (`Archivo, sans-serif` vs the app's own
// `Archivo, system-ui, sans-serif`) — Chrome's font-stretch matching behaves differently
// depending on the full fallback chain, not just which font actually ends up drawing the
// glyph. That single difference silently hid the real collision during the first calibration
// pass. Only the actual component, actual served font and actual stylesheet can be trusted for
// this measurement.
//
// Each row is wrapped in its own `data-glyph` container so the check script can locate a glyph
// by attribute instead of by scrolling a stream into view — IndexLetter itself stays untouched.
const HARD = ['M', 'N', 'P', 'Œ'];
const CLEAN = ['A', 'L', 'V', 'Z', '1'];
// '&' added for round 2 (index-letter treatment re-decision): the task's fixed crop set names
// it explicitly. Under the shipped solid-ink treatment every glyph — alphanumeric or symbol —
// takes the identical render, so '&' and '#' are redundant as *treatments*; both stay because
// the guard checks each individually, and a second symbol costs nothing to keep covered.
const SYMBOL = ['#', '&'];

const IndexLetterHarness = () => (
  <div style={{ background: 'var(--paper)' }}>
    {[...HARD, ...CLEAN, ...SYMBOL].map((letter) => (
      <div key={letter} data-glyph={letter} style={{ position: 'relative' }}>
        <IndexLetter letter={letter} count={1} />
      </div>
    ))}
  </div>
);

export default IndexLetterHarness;
