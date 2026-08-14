import { cn } from '@/lib/cn';

// Red measures 4.11:1 on paper — sound for rules and outlines, short of AA for small text — so
// the colour lives on the outline and the caps stay in ink.
//
// On a ROW it reads OUT alone. The borrower and the duration belong to item detail: lentTo
// permits 50 characters, which no row can hold, and nothing here is ever truncated. The row
// answers "is it out", the detail answers "who has it and how long".
const OverprintStamp = ({ name, days, inverted = false }) => {
  const label = name ? `Out · ${name}${days != null ? ` · ${days} days` : ''}` : 'Out';
  return (
    <span
      aria-label={name ? `On loan to ${name}` : 'On loan'}
      className={cn(
        'mt-2 inline-block -rotate-[4deg] border-2 border-out px-[6px] py-[2px]',
        'text-[10px] font-extrabold uppercase tracking-[0.14em] opacity-[0.92]',
        inverted ? 'text-paper' : 'text-ink',
      )}
    >
      {label}
    </span>
  );
};

export default OverprintStamp;
