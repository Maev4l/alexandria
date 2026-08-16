// A separator, not a heading: it marks position in the stream, it does not title a section.
//
// ROUND 2 (was: --imprint fill + --ink text-stroke). DESIGN.md §2 says yellow can only be a
// GROUND with ink on it, or a FILL inside an ink outline — a stroked-fill letter is the second
// construction, and that construction cannot work: `-webkit-text-stroke` traces every stroke of
// the glyph independently, so it collides with itself wherever a counter is narrower than the
// stroke. That is structural, not tunable. Round 1 (commit a96d086) spent an entire parameter
// sweep — weight down to 300, stretch up to 125%, stroke down to 0.3px — trying to out-thin the
// collision on `M`/`N`/`P`, and it never fully closed, because thinning the stroke also thins the
// one thing that makes yellow-on-paper legible at all (~1.55:1 unaided). That fix was reverted:
// rendered against the real stream (`/libraries/lib-huge`, not a lab crop), the residual mark on
// `M`/`N` was still plainly visible at reading size, so it had converted a rendering defect into
// a legibility defect without actually curing the defect it existed to fix.
//
// Two collision-free alternatives were rendered against the same crop set (M N P Œ & 1) and the
// same real stream. A third — solid ink knocked onto an --imprint plate around the letter — was
// also rendered per the design session's instruction to judge it from output rather than reject
// it on paper; in the stream shot it read as a tappable chip (the same silhouette as PlateButton's
// primary variant), which is exactly the risk DESIGN.md's palette law warns about: a filled
// --imprint shape is reserved for the active/selected state and primary actions, and painting one
// on every index letter in a 1000-item stream would make every separator look like a button.
//
// SHIPPED: solid --ink letter, no stroke, no fill — 18.18:1, the same ratio as every other run of
// body text. No counter can close because there is no offset outline to collide with itself, for
// any glyph the server's fold can produce, at any weight. `--imprint` did not leave the index
// apparatus: it moved from the shape to the 4px rule beneath it (`border-imprint`), which is the
// same "state lives on edges, not on content" discipline (the Iridescent Edge donation, DESIGN.md
// §1) the rest of the system already follows. The letterform itself is UNCHANGED from round 1's
// original — weight 900, stretch 62.5%, 76px — because nothing about solid ink required
// softening it; the "stroke reads larger than its size" premise that justified 76px never applied
// to a fill with no stroke, and 76px still reads as monumental with no width/weight concession.
//
// This also collapses the alphanumeric/symbol split entirely: every glyph the fold can produce —
// letters, digits, Œ, Æ, and `&`/`#`/`@`/every character that used to need the solid-ink carve-out
// — now takes the exact same treatment, because there is no longer a stroke for any of them to
// collide with. `isAlphanumericLabel` (src/lib/sort.js) is no longer imported here for that
// reason; it remains exported for its own tests and any other caller.
const IndexLetter = ({ letter, count }) => (
  <div
    role="separator"
    aria-label={`Titles beginning ${letter}`}
    className="sticky top-0 z-10 flex items-end justify-between border-b-4 border-imprint bg-paper px-4"
  >
    <span
      aria-hidden="true"
      className="text-[76px] font-black leading-[0.82] tracking-[-0.03em] text-ink [font-stretch:62.5%]"
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
