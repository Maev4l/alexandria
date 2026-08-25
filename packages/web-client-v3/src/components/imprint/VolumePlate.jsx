import { cn } from '@/lib/cn';

// Carries only a real count or order — a library's totalItems, a collection's itemCount, a
// member's order. Never an invented sequence number: the API has no item ordinal, so one
// would be fabricated data wearing the imprint's clothes.
//
// `ruled` is the DEFAULT, and that is the point. Yellow is how you find and how you act —
// the search field, index letters, the active state, primary actions. Ink is what you own.
// A count is inventory, not apparatus, so it takes a 2px ink rule and ink figures. The filled
// chrome-yellow plate is reserved for the active/selected state.
const VolumePlate = ({ filled = false, className, children, ...props }) => (
  <span
    className={cn(
      'num shrink-0 px-2 py-0.5 text-xs font-bold',
      filled ? 'on-imprint bg-imprint text-ink' : 'border-2 border-ink text-ink',
      className,
    )}
    {...props}
  >
    {children}
  </span>
);

export default VolumePlate;
