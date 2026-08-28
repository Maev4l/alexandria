import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

// Primary is a chrome-yellow plate, secondary a ruled outline, destructive a red outline.
// Never three fills competing.
//
// `on-imprint` flips the focus ring to ink: a yellow ring on a yellow plate is invisible.
const VARIANTS = {
  primary: 'on-imprint bg-imprint text-ink border-2 border-imprint',
  secondary: 'bg-transparent text-current border-2 border-current',
  // Red on the RULE, caps in the surface's own ink — the same resolution the Overprint Stamp
  // uses. --out is 4.11:1 on paper, sound for a 2px edge and short of AA for 12px text, so a red
  // label here would be the least legible text in the app on the one control where a misread
  // costs most.
  //
  // `text-current`, NOT a hardcoded `text-ink`: this variant sets no ground of its own
  // (`bg-transparent`), so it follows ambient like `secondary` does — a variant that paints no
  // ground of its own must take its colour from context, never assume one. A hardcoded `text-ink`
  // was invisible — ink on ink — the one time this shipped
  // straight onto item detail's black cover instead of inside a paper-grounded sheet; every
  // earlier use happened to sit inside a Sheet, where ambient ink and a hardcoded ink read
  // identically and the bug had nowhere to show itself.
  danger: 'bg-transparent text-current border-2 border-out',
};

// A disabled primary is drawn as the ruled outline, never as a faded plate. Half-strength
// --imprint would be a new colour meaning "disabled", which palette law forbids, and it drags
// its own label under the contrast floor. The outline filling in IS the affordance that says
// the form is now valid.
// forwardRef exists for exactly one caller today: ItemDetail's delete confirmation moves focus
// onto "Keep it" the moment it is revealed (the safe default, never the destructive button), the
// same "focus the thing that just appeared" mechanism Sheet.jsx already uses for its panel. That
// caller needs the real DOM node, not a React element.
// `reason` is the non-visual half of the outline-fills-to-plate affordance above. That swap is
// PURELY visual and has no equivalent for a screen-reader user: a disabled button is announced
// as unavailable and nothing connects that to the empty field that caused it. An
// `aria-describedby` was tried here first and removed — a disabled button is not focusable, so a
// description attached to it is never announced on tab and is reachable only by browse-mode
// reading, which made the attribute mostly dead weight where it lived.
//
// So the reason is rendered as `sr-only` text INSIDE the button instead: it becomes part of the
// button's own accessible name, which is exactly what a screen reader's linear/browse-mode
// reading walks over even though the element cannot take focus while disabled. Nothing new
// appears on screen — the caption text this replaces is exactly the visible nonsense the state
// grammar rejects: a control duplicating what it already speaks for itself visually.
const PlateButton = forwardRef(
  ({ variant = 'primary', disabled = false, reason, className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      className={cn(
        // `relative` is load-bearing and not decoration: the `sr-only` reason below is
        // `position: absolute`, so without a positioned ancestor its containing block is the
        // initial one — outside whatever scroll region the button sits in, therefore NOT clipped
        // by it. On a fixed-height screen that span's 1px box lands past the viewport's bottom
        // and lengthens `documentElement.scrollHeight`, so the whole page gains a slice of
        // scroll and the "pinned" header travels off the top after all. Measured on `NewBook`
        // (124px) and `NewVideo` (420px, its form being longer so the disabled submit sits
        // lower); `EditItem` was clean only because a loaded item enables the button and the
        // span is never rendered. Anchoring it here keeps it inside the region that clips it.
        'relative caps min-h-12 px-4 py-2 text-xs font-extrabold tracking-[0.12em]',
        'transition-colors duration-[var(--press-fast)] ease-linear',
        disabled && variant === 'primary' ? VARIANTS.secondary : VARIANTS[variant],
        disabled && 'cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {children}
      {/* Only when disabled: an enabled button needs no reason, and a reason with nothing to
          explain would just be noise appended to every accessible name. The leading space is a
          real text node, not styling — without it the accessible-name algorithm concatenates the
          two text runs with nothing between them ("Look upEnter an ISBN..."). */}
      {disabled && reason && (
        // `normal-case`: this span sits inside a `caps` button, so it inherited
        // `text-transform: uppercase` and the reason was UPPERCASE in the DOM. Chrome's
        // accessibility tree still reports mixed case, so this is NOT a proven announcement
        // defect and must not be described as one — it costs nothing, and a sentence meant to be
        // read as prose should not be shouted in the markup either way.
        <span className="sr-only normal-case"> {reason}</span>
      )}
    </button>
  ),
);

PlateButton.displayName = 'PlateButton';

export default PlateButton;
