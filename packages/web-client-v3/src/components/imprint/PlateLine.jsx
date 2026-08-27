import { cn } from '@/lib/cn';
import { candidateLineParts, plateLineParts } from '@/lib/format';

// The line's position never changes; only which fields fill it — and it already varies those by
// surface, gaining the edition on item detail. `surface` selects which variant this is:
//
//   `row`       DIRECTOR · YEAR            the browse stream
//   `candidate` DIRECTOR · YEAR · RUNTIME  the detection-results screens
//
// The runtime folds INTO the line rather than keeping one of its own because on a comparison
// screen every row's height is paid once per candidate — five times at the resolver's maximum.
// See `candidateLineParts` for why a runtime belongs on that surface at all, which is not the
// reason anyone would guess.
//
// Mixed typeface on a film, and that is correct rather than awkward: a name and a figure are
// different kinds of thing, and the mono is reserved for numerals. Names take the sans.
const PARTS = { row: plateLineParts, candidate: candidateLineParts };

const PlateLine = ({ item, surface = 'row', className }) => {
  const parts = PARTS[surface](item);
  // `row` returns `{ names, year }`; `candidate` returns `{ names, identifiers }`. Normalised
  // here rather than by widening `plateLineParts`, whose two-field shape is what every existing
  // caller and its tests already read.
  const names = parts.names;
  const identifiers = parts.identifiers ?? (parts.year ? [parts.year] : []);
  if (!names && identifiers.length === 0) return null;

  return (
    <span className={cn('mt-[3px] block text-[14px] text-ink-soft', className)}>
      {names}
      {identifiers.map((value, index) => (
        <span key={value}>
          {(names || index > 0) && ' · '}
          <span className="num text-[12px]">{value}</span>
        </span>
      ))}
    </span>
  );
};

export default PlateLine;
