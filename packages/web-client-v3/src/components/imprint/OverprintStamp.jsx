import { cn } from '@/lib/cn';

// Red measures 4.11:1 on paper — sound for rules and outlines, short of AA for small text — so
// the colour lives on the outline and the caps stay in ink.
//
// On a ROW it reads OUT alone. The borrower and the duration belong to item detail: lentTo
// permits 50 characters, which no row can hold, and nothing here is ever truncated. The row
// answers "is it out", the detail answers "who has it and how long".
//
// The comp defines the row stamp (`.stamp`) and the cover's open-loan stamp (`.stamp-open`) as
// two distinct rules, not one style read twice: the row sits at 0.92 opacity so it "reads as ink
// over paper", while the cover's stamp is full-strength paper-coloured ink with a
// tighter 1px/5px pad — there is no paper ground on the cover for the opacity trick to read
// against. `inverted` already forks the text colour for this reason, so it forks these too.
const OverprintStamp = ({ name, days, inverted = false }) => {
  const label = name ? `Out · ${name}${days != null ? ` · ${days} days` : ''}` : 'Out';
  // Accessibility is parity, not a shorter summary: the visible label carries the duration
  // (`days != null`, never truthiness — a loan can legitimately be 0 days old), so the
  // announced name must carry it too, or a screen-reader user gets fewer facts than a sighted
  // one reads off the same stamp.
  const ariaLabel = name
    ? `On loan to ${name}${days != null ? ` for ${days} days` : ''}`
    : 'On loan';
  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        'inline-block -rotate-[4deg] border-2 border-out',
        'text-[10px] font-extrabold uppercase tracking-[0.14em]',
        inverted
          ? // No extra top margin: on the cover this stamp is the last mark in DetailMarks'
            // own flex column (`gap-2`), which already spaces it from whatever mark sits above
            // it (the library name, the shared ribbon, or nothing). A margin here as well would
            // double that gap on top of the one the parent already provides.
            'px-[5px] py-px text-paper'
          : 'mt-2 px-[6px] py-[2px] text-ink opacity-[0.92]',
      )}
    >
      {label}
    </span>
  );
};

export default OverprintStamp;
