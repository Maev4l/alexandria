import { cn } from '@/lib/cn';
import OverprintStamp from './OverprintStamp.jsx';

const stamp = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// One loan pairing, over two lines (DESIGN.md section 5 "Ledger Row", comp 3's `.ledger-row`).
// There is no due date in this API, so a loan states its duration and nothing about lateness.
//
// `boxed` is its own prop rather than being keyed off `inverted`: `inverted` is a surface fact
// (paper vs. the black cover) and both surfaces need this ledger; `boxed` is a LAYOUT fact (does
// this row sit inside a bordered card, or flush in a text column) that is independent of which
// surface it's on. Item history is boxed and never inverted; item detail is inverted and never
// boxed today, but nothing here assumes those always travel together.
const LedgerRow = ({ loan, inverted = false, boxed = false }) => {
  const duration = loan.unresolved ? 'no return recorded' : `${loan.days} days`;
  const dates = loan.open
    ? `${stamp(loan.lentAt)} → still out`
    : `${stamp(loan.lentAt)} → ${loan.returnedAt ? stamp(loan.returnedAt) : '—'}`;

  return (
    <div
      className={cn(
        'border-b py-2 text-[11px]',
        inverted ? 'border-cover-rule text-cover-soft' : 'border-ink text-ink-soft',
        // Padding lives on the ROW, not on whatever wraps it: with the separator on the same
        // element the border still spans the full width. Padding the card instead would leave
        // hairlines stopping short of the rule, reading as broken (DESIGN.md section 5).
        boxed && 'px-4',
      )}
    >
      {/* Line 1: who has it, and for how long — the reason the row exists. The name is
          content, authored by whoever typed it into the Lend sheet, so it sets in the sans
          (never `.num`); a name in mono is the category error the Plate Line already warns
          about (section 3). The comp brightens this whole line on an open loan — there is no
          brighter-than-`--ink` tone on paper to promote to, so that lift only has somewhere to
          go on the cover, where `--paper` sits above `--cover-body`. */}
      <span
        className={cn(
          'flex justify-between gap-2 text-[13px]',
          inverted ? (loan.open ? 'text-paper' : 'text-cover-body') : 'text-ink',
        )}
      >
        <span>{loan.name}</span>
        <span className="num">{duration}</span>
      </span>
      {/* Line 2: when it left, and when (or whether) it came back. Only the dates and the day
          count are numerals, so this line stays mono throughout. */}
      <span className="num mt-0.5 block">{dates}</span>
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
          says (DESIGN.md's "nothing is labelled twice"). */}
      {boxed && loan.open && <OverprintStamp />}
    </div>
  );
};

export default LedgerRow;
