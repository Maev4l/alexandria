import { cn } from '@/lib/cn';
import { isAlphanumericLabel } from '@/lib/sort';

// A separator, not a heading: it marks position in the stream, it does not title a section.
//
// Yellow belongs here — an index letter is the apparatus of finding, not inventory. But
// --imprint on --paper measures 1.55:1, so yellow cannot describe a shape on paper at all: it
// can only be a ground with ink on it, or a fill inside an ink outline. The 2px ink stroke is
// therefore the entire contrast mechanism, not decoration, which is why 76px reads as
// monumental — a stroked yellow letter reads larger than its size.
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
        'text-[76px] font-black leading-[0.82] tracking-[-0.03em] [font-stretch:62.5%]',
        isAlphanumericLabel(letter)
          ? 'text-imprint [-webkit-text-stroke:2px_var(--ink)]'
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
