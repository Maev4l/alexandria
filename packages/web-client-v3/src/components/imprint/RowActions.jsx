import { cn } from '@/lib/cn';

// The visible duplicate of long-press, which alone is undiscoverable. Three 3px ink squares,
// not round dots and not a text ellipsis: the world has no radii, and a glyph character can
// fall back to something else entirely.
//
// 48px target, negatively margined so the affordance does not inflate the row it sits in.
const RowActions = ({ onClick, label, className }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={cn(
      'flex size-12 shrink-0 items-center justify-center gap-[3px] -my-2 -mr-2',
      className,
    )}
  >
    <span className="block size-[3px] bg-ink" />
    <span className="block size-[3px] bg-ink" />
    <span className="block size-[3px] bg-ink" />
  </button>
);

export default RowActions;
