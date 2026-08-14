import { cn } from '@/lib/cn';
import { plateLineParts } from '@/lib/format';

// The line's position never changes; only which fields fill it.
//
// Mixed typeface on a film, and that is correct rather than awkward: a name and a figure are
// different kinds of thing, and §3 reserves the mono for numerals. Names take the sans.
const PlateLine = ({ item, className }) => {
  const { names, year } = plateLineParts(item);
  if (!names && !year) return null;

  return (
    <span className={cn('mt-[3px] block text-[11px] text-ink-soft', className)}>
      {names}
      {names && year && ' · '}
      {year && <span className="num">{year}</span>}
    </span>
  );
};

export default PlateLine;
