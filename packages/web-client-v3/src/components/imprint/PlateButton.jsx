import { cn } from '@/lib/cn';

// Primary is a chrome-yellow plate, secondary a ruled outline, destructive a red outline.
// Never three fills competing.
//
// `on-imprint` flips the focus ring to ink: a yellow ring on a yellow plate is invisible.
const VARIANTS = {
  primary: 'on-imprint bg-imprint text-ink border-2 border-imprint',
  secondary: 'bg-transparent text-current border-2 border-current',
  danger: 'bg-transparent text-out border-2 border-out',
};

const PlateButton = ({ variant = 'primary', className, children, ...props }) => (
  <button
    type="button"
    className={cn(
      'caps min-h-12 px-4 py-2 text-xs tracking-[0.12em]',
      'transition-colors duration-[var(--press-fast)] ease-linear',
      'disabled:opacity-40',
      VARIANTS[variant],
      className,
    )}
    {...props}
  >
    {children}
  </button>
);

export default PlateButton;
