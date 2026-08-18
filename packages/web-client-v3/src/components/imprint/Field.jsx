import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { ChevronDown, Eye, EyeOff } from '@/components/icons/index.jsx';

// No radius, a 2px bottom rule, a caps label above. No floating label: it would animate, and
// print does not. Errors sit under the field, in place, never only in a toast.
const Field = ({ label, error, hint, counter, className, as = 'input', type, describedBy, ...props }) => {
  const id = useId();
  const Tag = as;
  // Reveal state lives in plain component state and NOWHERE else — no localStorage, no
  // module-level variable, no context that would outlive this mount. It always opens masked:
  // a revealed password surviving a back-navigation onto a screen someone else can see is a
  // real exposure, and "it was only remembered for the session" is exactly how that ships.
  const [revealed, setRevealed] = useState(false);
  const isPassword = as === 'input' && type === 'password';

  const borderClass = error ? 'border-out' : 'border-ink';
  const noteId = error || hint ? `${id}-note` : undefined;
  // `describedBy` is an EXTRA id a caller supplies (a reason the submit control beside this
  // field can't be used yet, per DESIGN.md §6's second form for an inert action slot) — merged
  // with the field's own note id rather than replacing it, so a screen-reader user gets both the
  // ordinary hint/error AND that reason when both exist. `aria-describedby` accepts a
  // space-separated list; `undefined` when neither is present, never an empty string.
  const ariaDescribedBy = [noteId, describedBy].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('mb-6', className)}>
      <label htmlFor={id} className="caps mb-1 block text-[11px] font-bold text-ink-soft">
        {label}
      </label>
      {isPassword ? (
        // The bottom rule moves from the input to this row, because the row — input plus
        // reveal mark — is the field the reader sees as one thing. `field-control` is a
        // DIFFERENT mechanism from the search field's `focus-control` (see index.css RULING 3):
        // it indicates only when the INPUT specifically is focus-visible, so the mark keeps its
        // own separate ring rather than being suppressed whenever either descendant is focused.
        <div className={cn('field-control flex items-center border-b-2', borderClass)}>
          <Tag
            id={id}
            type={revealed ? 'text' : 'password'}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={ariaDescribedBy}
            className="min-h-12 min-w-0 flex-1 bg-transparent px-0 py-2 text-base text-ink"
            {...props}
          />
          {/* type="button": inside a <form>, a button with no explicit type submits it, which
              here would submit the form the instant the reader tries to reveal what they typed. */}
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            className="-my-2 -mr-2 flex size-12 shrink-0 items-center justify-center text-ink"
          >
            {revealed ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      ) : as === 'select' ? (
        // A native <select> draws its own disclosure arrow, which is exactly the chrome §9
        // refuses — a glyph this world never authored, at someone else's stroke weight. The
        // select itself stays the real, focusable, keyboard-operable control (its own
        // :focus-visible ring needs no help, unlike the compound password/search fields
        // above); only the arrow is replaced, drawn over it and out of the tab order.
        <div className="relative">
          <Tag
            id={id}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={ariaDescribedBy}
            className={cn(
              'min-h-12 w-full appearance-none border-b-2 bg-transparent px-0 py-2 pr-6 text-base text-ink',
              borderClass,
            )}
            {...props}
          />
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-ink-soft"
          />
        </div>
      ) : (
        <Tag
          id={id}
          type={type}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={ariaDescribedBy}
          className={cn(
            // No `outline-none` here. Tailwind utilities sit in a later cascade layer than the
            // :focus-visible rule in index.css, so suppressing the outline on the component
            // silently kills the focus ring on every input in the app — the colour and width
            // still resolve, only outline-style becomes none, which is invisible to a
            // stylesheet test. scripts/check-browser.mjs now computes the resolved style.
            'min-h-12 w-full border-b-2 bg-transparent px-0 py-2 text-base text-ink',
            // The browser's resize grabber is a rounded, diagonal piece of chrome this world
            // has no vocabulary for. Height comes from rows instead.
            as === 'textarea' && 'resize-none',
            // Same refusal for the number spinner: it is a pair of tiny rounded arrows with no
            // rule and no place in a system whose every radius is 0. `-moz-appearance` is the
            // Firefox-only equivalent; Chrome/Safari need the two pseudo-elements suppressed.
            type === 'number' &&
              '[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            borderClass,
          )}
          {...props}
        />
      )}
      {(error || hint || counter != null) && (
        <div className="mt-1 flex justify-between gap-2">
          <span
            id={`${id}-note`}
            role={error ? 'alert' : undefined}
            className={cn('text-[13px]', error ? 'text-ink' : 'text-ink-soft')}
          >
            {error || hint}
          </span>
          {/* A bare `100` (or, at the moment it matters most, a bare `3`) is an unlabelled
              number — DESIGN.md §3's mono-numerals rule doesn't cover the WORD beside it, and a
              figure alone reads as noise. `<n> LEFT`: the figure inherits `.num` from this
              wrapper (mono), the caps label resets to the sans explicitly — `caps` carries case
              and tracking only (§3), never weight, so `font-bold` is stated here rather than
              assumed. This single span is now the ONE place the split happens; ItemForm.jsx's
              own `remaining()` used to duplicate it (double `.num` wrap: its outer span here
              plus the inner one `remaining()` built for the figure) and has been removed in
              favour of this. */}
          {counter != null && (
            <span className="num text-[11px] text-ink-soft">
              {counter} <span className="caps font-sans font-bold">left</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Field;
