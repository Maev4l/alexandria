import { cn } from '@/lib/cn';

// Solid chrome yellow, mono figures. Carries only a real count or order — a library's
// totalItems, a collection's itemCount, a member's order. Never an invented sequence number:
// the API has no item ordinal, so one would be fabricated data wearing the imprint's clothes.
const VolumePlate = ({ className, children, ...props }) => (
  <span
    className={cn(
      'num on-imprint shrink-0 bg-imprint px-2 py-0.5 text-xs font-bold text-ink',
      className,
    )}
    {...props}
  >
    {children}
  </span>
);

export default VolumePlate;
