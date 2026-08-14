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

// A disabled primary is drawn as the ruled outline, never as a faded plate. Half-strength
// --imprint would be a new colour meaning "disabled", which palette law forbids, and it drags
// its own label under the contrast floor. The outline filling in IS the affordance that says
// the form is now valid.
const PlateButton = ({ variant = 'primary', disabled = false, className, children, ...props }) => (
  <button
    type="button"
    disabled={disabled}
    className={cn(
      'caps min-h-12 px-4 py-2 text-xs font-extrabold tracking-[0.12em]',
      'transition-colors duration-[var(--press-fast)] ease-linear',
      disabled && variant === 'primary' ? VARIANTS.secondary : VARIANTS[variant],
      disabled && 'cursor-not-allowed',
      className,
    )}
    {...props}
  >
    {children}
  </button>
);

export default PlateButton;
