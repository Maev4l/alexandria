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
// F3: expanded beyond '#'/'&' to re-test the symbol carve-out itself — the claim that these
// self-cross and collide with a stroke was made in system-ui fallback (same contaminated round
// as the letters that turned out fine) and had never been checked in real Archivo. Set covers
// every ASCII punctuation mark named anywhere in this codebase's own comments/history as a
// character a title's folded first character could plausibly be: '@'/'*'/'%' (old carve-out
// comment), quotes and parens (real content in fixtures — curly quotes, "l'ordre" — plus the
// ASCII form a title could start with).
const SYMBOL = ['#', '&', '@', '*', '"', "'", '(', ')', '%'];

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
