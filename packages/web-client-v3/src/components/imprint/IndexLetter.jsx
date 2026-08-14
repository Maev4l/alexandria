// A separator, not a heading: it marks position in the stream, it does not title a section.
// Chrome yellow filled with a 2px ink stroke, which is why 76px reads as monumental — a
// stroked yellow letter reads larger than its size.
//
// Yellow belongs here: an index letter is the apparatus of finding, not inventory.
const IndexLetter = ({ letter, count }) => (
  <div
    role="separator"
    aria-label={`Titles beginning ${letter}`}
    className="sticky top-0 z-10 flex items-end justify-between border-b-4 border-ink bg-paper px-4"
  >
    <span
      aria-hidden="true"
      className="text-[76px] font-black leading-[0.82] tracking-[-0.03em] text-imprint [font-stretch:62.5%] [-webkit-text-stroke:2px_var(--ink)]"
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
