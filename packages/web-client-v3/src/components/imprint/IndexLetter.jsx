import { cn } from '@/lib/cn';
import { isAlphanumericLabel } from '@/lib/sort';

// A separator, not a heading: it marks position in the stream, it does not title a section.
//
// Yellow belongs here — an index letter is the apparatus of finding, not inventory. But
// --imprint on --paper measures 1.55:1, so yellow cannot describe a shape on paper at all: it
// can only be a ground with ink on it, or a fill inside an ink outline. The ink stroke is
// therefore the entire contrast mechanism, not decoration, which is why 76px reads as
// monumental — a stroked yellow letter reads larger than its size.
//
// P1 FIX (was 2px stroke / weight 900 / stretch 62.5%): DESIGN.md's old claim that a stroke
// only collides on a glyph with crossing strokes was wrong — the real mechanism is counter
// width against stroke width, and at the old parameters `M`, `N` and `P` all had counters too
// narrow for a 2px stroke to trace without self-intersecting. Calibrated against rendered
// crops through this project's OWN dev server (see scripts/check-index-letter.mjs) — a
// hand-rolled recreation with identical-looking CSS measured a glyph ~15% WIDER than this app
// ever renders (a Chrome font-matching quirk tied to the font-family fallback chain), which
// silently hid the collision during the first calibration pass. `weight: 400` and
// `stretch: 100%` open the counters; `0.85px` is the thinnest stroke that still traces every
// glyph as a continuous line at 76px. `P` and `Œ` are fully clean at these values; `M` and `N`
// keep one small residual mark at their sharpest interior angles that no combination tried
// (weight down to 300, stretch up to the font's 125% ceiling, stroke down to 0.3px) removed
// entirely — see the P1 fix report for the sweep. That mark is a short tick, not the doubled
// outline / self-crossing line the old parameters produced, so it ships as the least-bad
// result rather than chasing a perfect one at the cost of the letter reading as regular-weight
// body text instead of a monumental marker.
//
// The treatment is bounded by the glyph rather than patched per symbol. Alphanumerics are
// single-outline shapes and take the stroke cleanly. Anything else — &, @, %, *, « — crosses
// itself, and the stroke collides with itself in the counters, so those render solid ink at
// 18:1 instead. Solid ink holds for any character the data can ever produce.
const IndexLetter = ({ letter, count }) => (
  <div
    role="separator"
    aria-label={`Titles beginning ${letter}`}
    className="sticky top-0 z-10 flex items-end justify-between border-b-4 border-ink bg-paper px-4"
  >
    <span
      aria-hidden="true"
      className={cn(
        'text-[76px] font-normal leading-[0.82] tracking-[-0.03em] [font-stretch:100%]',
        isAlphanumericLabel(letter)
          ? 'text-imprint [-webkit-text-stroke:0.85px_var(--ink)]'
          : 'text-ink',
      )}
    >
      {letter}
    </span>
    {/* No count on the run still filling: it would grow while the reader looks at it. */}
    {count != null && (
      <span className="num pb-2 text-[11px] text-ink-soft">
        {count} {count === 1 ? 'volume' : 'volumes'}
      </span>
    )}
  </div>
);

export default IndexLetter;
