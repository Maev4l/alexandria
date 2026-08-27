import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { ChevronDown, Eye, EyeOff } from '@/components/icons/index.jsx';

// No radius, a 2px bottom rule, a caps label above. No floating label: it would animate, and
// print does not. Errors sit under the field, in place, never only in a toast.
//
// `required` speaks at the point where fixing the problem actually happens: `required` +
// `aria-required` announce "<label>, required" while the reader is IN the field, rather than only
// at a disabled submit button where a sighted reader merely observes the consequence (see
// PlateButton's `reason`). The location of a visual affordance is not necessarily the right
// location for its non-visual equivalent — that is now a general rule in this system, and this and
// `reason` are its two instances. `noValidate` on every form using Field is what keeps `required`
// from also raising the browser's own validation bubble, native chrome this world has no
// vocabulary for — verified against every `<form>` in the app before relying on it here.
// `liveHint`: the hint CHANGES as the reader types and the change is the information — a password
// rule list that goes from four unmet to none is silent otherwise, so the qualifying moment, the
// one the reader is waiting for, is the one nothing announces.
//
// Opt-in rather than automatic, because most hints here are static: making every one a live region
// would announce unchanging text on each render, which is the crying-wolf failure that gets a
// mechanism switched off rather than fixed.
//
// Note the parity argument this shares with the disabled primary button's own `reason` text: both
// are cases where the visual signal (a list shortening, an outline filling to a plate) has no
// non-visual equivalent, and both belong in this shared primitive rather than on the screens that
// surface them.
const Field = ({ label, error, hint, liveHint = false, counter, className, as = 'input', type, required = false, ...props }) => {
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
  // A prior attempt at the disabled-reason gap routed it through here — an extra id a caller
  // supplied, merged into this field's own `aria-describedby` so the FIELD spoke the submit
  // button's reason. That mechanism is gone: a disabled button is not focusable, so a description
  // that only fires when the field itself is read is no better placed than the button was. The
  // replacement (PlateButton's `reason`) is self-contained in the button that needs it and reads
  // in browse mode with no cooperation from the field, so there is nothing left for a
  // `describedBy` prop here to do.
  const ariaDescribedBy = noteId;

  return (
    <div className={cn('mb-6', className)}>
      {/* +0.12em — the field label's own tracking value, distinct from the section header's
          +0.16em. The difference is the point: both were 11px caps in the same tone, so nothing
          marked where one section's heading ended and its fields began — and the register carries
          that distinction without a new rule or a new size. */}
      <label htmlFor={id} className="caps mb-1 block text-[11px] font-bold tracking-[0.12em] text-ink-soft">
        {label}
      </label>
      {isPassword ? (
        // The bottom rule moves from the input to this row, because the row — input plus
        // reveal mark — is the field the reader sees as one thing. `field-control` is a
        // DIFFERENT mechanism from the search field's `focus-control` (see index.css RULING 3):
        // it indicates only when the INPUT specifically is focus-visible, so the mark keeps its
        // own separate ring rather than being suppressed whenever either descendant is focused.
        <div
          className={cn(
            // THE RULE IS DRAWN, NOT BORDERED, so this row is the same height as a plain field.
            // §6: an edge rule never displaces content — a border adds its own width to the box.
            // As `border-b-2` this row measured 50px against a plain input's 48: the input inside
            // is `min-h-12` and the border sat outside it, so the field was 2px taller than every
            // other field in the app and its ink rule sat 2px lower. Drawn as an absolutely
            // positioned 2px bar it overlays the input's own bottom 2px instead, which is exactly
            // where a plain input's border already is — so both fields are 48px, both rules land
            // on the same line, and the focus ring hugs an identical box on each.
            //
            // The input keeps its full 48px: shrinking it to fit a bordered 48px row was the
            // other way to even this up, and it would have taken the tappable field to 46px,
            // under §4's 48px minimum, to save a border.
            'field-control relative flex items-center',
            'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:content-[""]',
            error ? 'after:bg-out' : 'after:bg-ink',
          )}
        >
          <Tag
            id={id}
            type={revealed ? 'text' : 'password'}
            required={required}
            aria-required={required || undefined}
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
        // A native <select> draws its own disclosure arrow, which is exactly the native control
        // chrome this world has no vocabulary for — a glyph this world never authored, at
        // someone else's stroke weight. The
        // select itself stays the real, focusable, keyboard-operable control (its own
        // :focus-visible ring needs no help, unlike the compound password/search fields
        // above); only the arrow is replaced, drawn over it and out of the tab order.
        <div className="relative">
          <Tag
            id={id}
            required={required}
            aria-required={required || undefined}
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
          required={required}
          aria-required={required || undefined}
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
            role={error ? 'alert' : liveHint ? 'status' : undefined}
            className={cn('text-[13px]', error ? 'text-ink' : 'text-ink-soft')}
          >
            {error || hint}
          </span>
          {/* A bare `100` (or, at the moment it matters most, a bare `3`) is an unlabelled
              number — only the figure may be mono, never the word beside it, and a figure alone
              reads as noise. `<n> LEFT`: the figure inherits `.num` from this wrapper (mono), the
              caps label resets to the sans explicitly — `caps` carries case and tracking only,
              never weight, so `font-bold` is stated here rather than assumed. This single span is
              now the ONE place the split happens; ItemForm.jsx's
              own `remaining()` used to duplicate it (double `.num` wrap: its outer span here
              plus the inner one `remaining()` built for the figure) and has been removed in
              favour of this. */}
          {counter != null && (
            <span className="num text-[11px] text-ink-soft">
              {counter} <span className="caps font-sans font-bold tracking-[0.12em]">left</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Field;
