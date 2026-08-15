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
// over paper" (DESIGN.md §5), while the cover's stamp is full-strength paper-coloured ink with a
// tighter 1px/5px pad — there is no paper ground on the cover for the opacity trick to read
// against. `inverted` already forks the text colour for this reason, so it forks these too.
const OverprintStamp = ({ name, days, inverted = false }) => {
  const label = name ? `Out · ${name}${days != null ? ` · ${days} days` : ''}` : 'Out';
  return (
    <span
      aria-label={name ? `On loan to ${name}` : 'On loan'}
      className={cn(
        'inline-block -rotate-[4deg] border-2 border-out',
        'text-[10px] font-extrabold uppercase tracking-[0.14em]',
        inverted
          ? // No extra top margin: on the cover this stamp directly follows the yellow rule,
            // which already carries its own 16px bottom margin. Adding one here as well would
            // double the gap the comp draws as a single step (mockup line 496, `.detail-rule`
            // immediately followed by `.stamp-open` with no margin of its own).
            'px-[5px] py-px text-paper'
          : 'mt-2 px-[6px] py-[2px] text-ink opacity-[0.92]',
      )}
    >
      {label}
    </span>
  );
};

export default OverprintStamp;
