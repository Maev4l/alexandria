// A separator, not a heading: it marks position in the stream, it does not title a section.
//
// ADOPTED: --imprint fill with a 2px --ink text-stroke, weight 900, width 62.5%, 76px.
//
// This treatment was rejected twice and reinstated, and the correction is worth recording because
// the reasoning was sound and the evidence was not. Rounds 1 and 2 measured the stroke colliding
// with itself in the counters of M, N and P, concluded the construction was structurally unusable,
// and moved to solid ink. Every one of those crops rendered in `system-ui`: both shipped font files
// were near-empty, holding three ASCII codepoints between them, and `font-stretch: 62.5%` is
// silently ignored by a face with no width axis — so the glyphs judged were neither Archivo's nor
// condensed. Re-shot in the real face, M N P Œ all have fully open counters, and the width axis
// narrows every glyph 27-44%.
//
// The mechanism was never wrong: an outline traced per stroke does collide wherever a counter is
// narrower than twice the stroke. It simply does not bite in this face at these parameters. That
// makes the treatment correct but parameter-bound — DESIGN.md §4 requires re-verifying against
// rendered crops whenever weight, width or stroke moves, and scripts/check-index-letter.mjs pins it
// so a change cannot pass silently. Solid ink would have been more robust; the guard is what was
// bought instead, and the difference that makes it acceptable is that this fails loudly.
//
// There is no symbol carve-out. An earlier draft of this file kept one, on the argument that a
// bucket which is not a letter reads as structurally different regardless of whether it collides —
// but that argument was never tested against the actual claim it was hedging against, which is that
// `#` "resolves into nine separate yellow quadrilaterals" at this weight/stroke. That claim is from
// the same contaminated (system-ui) round as the letters, and does not hold either: rendered with
// this exact stroked treatment, `#`, `&`, `@`, `*` and every ASCII punctuation mark a title's folded
// first character could plausibly be all render as one connected, open shape — `#`'s fill measured
// 96%+ in a single connected region, the rest antialiasing noise, not the nine similarly-sized
// fragments the claim would predict. One treatment, no exception, for every glyph the fold produces.
const IndexLetter = ({ letter, count }) => (
  <div
    role="separator"
    aria-label={`Titles beginning ${letter}`}
    className="sticky top-0 z-10 flex items-end justify-between border-b-4 border-ink bg-paper px-4"
  >
    <span
      aria-hidden="true"
      className="text-[76px] font-black leading-[0.82] tracking-[-0.03em] text-imprint [-webkit-text-stroke:2px_var(--ink)] [font-stretch:62.5%]"
    >
      {letter}
    </span>
    {/* No count on the run still filling: it would grow while the reader looks at it.
        Only the figure is a numeral — "volume"/"volumes" is a word, so it stays in the sans
        (inherited, no override needed) and only the count itself takes `.num`, the same split
        LedgerRow already makes for "9 days" (DESIGN.md §3: a word in mono is a category error).
        This was the sweep's seed instance: invisible while both faces rendered as `system-ui`. */}
    {count != null && (
      <span className="pb-2 text-[11px] text-ink-soft">
        <span className="num">{count}</span> {count === 1 ? 'volume' : 'volumes'}
      </span>
    )}
  </div>
);

export default IndexLetter;
