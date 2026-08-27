import { cn } from '@/lib/cn';
import OverprintStamp from './OverprintStamp.jsx';

const stamp = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// One loan pairing, over two lines ("Ledger Row" in the component vocabulary, comp 3's
// `.ledger-row`). There is no due date in this API, so a loan states its duration and nothing
// about lateness.
//
// `boxed` is its own prop rather than being keyed off `inverted`: `inverted` is a surface fact
// (paper vs. the black cover) and both surfaces need this ledger; `boxed` is a LAYOUT fact (does
// this row sit inside a bordered card, or flush in a text column) that is independent of which
// surface it's on. Item history is boxed and never inverted; item detail is inverted and never
// boxed today, but nothing here assumes those always travel together.
const LedgerRow = ({ loan, inverted = false, boxed = false }) => {
  return (
    <div
      className={cn(
        'border-b py-2 text-[11px]',
        inverted ? 'border-cover-rule text-cover-soft' : 'border-ink text-ink-soft',
        // Padding lives on the ROW, not on whatever wraps it: with the separator on the same
        // element the border still spans the full width. Padding the card instead would leave
        // hairlines stopping short of the rule, reading as broken.
        boxed && 'px-4',
      )}
    >
      {/* Line 1: who has it, and for how long — the reason the row exists. The name is
          content, authored by whoever typed it into the Lend sheet, so it sets in the sans
          (never `.num`); a name in mono is the category error the Plate Line already warns
          about. The comp brightens this whole line on an open loan — there is no
          brighter-than-`--ink` tone on paper to promote to, so that lift only has somewhere to
          go on the cover, where `--paper` sits above `--cover-body`.

          The duration itself is words AND a numeral — "9 days" — so only the figure takes
          `.num`; "days" is a unit word, not a numeral, and stays in the sans (same rule as the
          Plate Line's "a name in mono is a category error" — a WORD in mono is the same error,
          just with a different word). This was invisible while the whole app rendered in
          `system-ui` (nobody could see which face a word was in); the font fix that made the
          `→` glyph gap visible also made this one visible, on every row. "no return recorded"
          has no numeral in it at all, so it takes no mono span whatsoever. */}
      <span
        className={cn(
          'flex justify-between gap-2 text-[13px]',
          inverted ? (loan.open ? 'text-paper' : 'text-cover-body') : 'text-ink',
        )}
      >
        <span>{loan.name}</span>
        <span>
          {loan.unresolved ? (
            'no return recorded'
          ) : (
            <>
              <span className="num">{loan.days}</span>
              {' '}
              days
            </>
          )}
        </span>
      </span>
      {/* Line 2: when it left, and — for a genuinely CLOSED loan — when it came back.
          `LENT`/`RETURNED` are interface labels: caps, set in the SANS (never `.num`), with
          weight stated explicitly here because the `caps` utility carries case and tracking
          only, never weight. Only the dates themselves are numerals and
          take the mono. There is no connector joining the two fields — no arrow, no dash
          between them — labelling both endpoints is the one grammar that reads the same for a
          closed loan and an open one. `→` (U+2192) is the glyph this replaces: verified absent
          from every shipped cut of both faces (src/fonts.test.js), so it fell back to
          `ui-monospace` inside an otherwise all-Chivo-Mono line.

          An OPEN loan states only the LENT half: there is no second date to label, and the
          loan is already stamped OUT (on the cover via DetailMarks, or here via the bare
          OverprintStamp below when boxed) — printing "still out" beside that stamp would say
          the same thing twice, which the nothing-is-labelled-twice discipline forbids.

          An UNRESOLVED pairing (a LENT superseded by another LENT with no RETURNED between
          them, see `pairLoanEvents` in lib/loans.js) reads the SAME as an open loan here —
          `LENT <date>` alone. It is tempting to keep a `RETURNED` label with a placeholder
          value, on the argument that the loan structurally DID end (a later LENT proves it).
          That argument is correct but doesn't belong on this line: the duration slot above
          already states "no return recorded", precisely and in words — a `RETURNED —` here
          would restate that same fact in a weaker form, which is exactly the position an open
          loan is in with its own stamp — the same nothing-is-labelled-twice discipline. So the two
          rows share this line's grammar and differ only in the duration slot and, for a boxed
          open loan, the stamp — never ambiguous, since the stamp only ever marks OPEN. */}
      <span className="mt-0.5 block">
        <span className="caps text-[10px] font-extrabold tracking-[0.16em]">Lent</span>{' '}
        <span className="num">{stamp(loan.lentAt)}</span>
        {!loan.open && !loan.unresolved && (
          <>
            {' · '}
            <span className="caps text-[10px] font-extrabold tracking-[0.16em]">Returned</span>{' '}
            <span className="num">{stamp(loan.returnedAt)}</span>
          </>
        )}
      </span>
      {/* Round 5 critique #6: an open loan on the PAPER surface carried no stamp at all — the
          "brighten the whole line" treatment the comp gives an open loan on the COVER has
          nowhere to go here, because paper has no tone brighter than `--ink` to promote to
          (unlike the cover's `--paper` above `--cover-body`), and palette law permits no
          eleventh token to invent one. Gated on `boxed` rather than a new prop: `boxed` already
          means "this is the paper ledger card" (item detail's inline ledger is never boxed, and
          item history's is always boxed), so it is the existing, correct signal for exactly the
          one surface this was missing from — solved with the Overprint Stamp's OWN
          construction (its `--out` outline, its ink caps) rather than with colour. Bare, no
          name/days: this row's own two lines already state who and how long, so the stamp only
          needs to contribute the "OUT" mark itself, or it would restate what the row already
          says — the same nothing-is-labelled-twice discipline. */}
      {boxed && loan.open && <OverprintStamp />}
    </div>
  );
};

export default LedgerRow;
