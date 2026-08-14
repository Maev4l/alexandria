import { useId } from 'react';
import { cn } from '@/lib/cn';

// No radius, a 2px bottom rule, a caps label above. No floating label: it would animate, and
// print does not. Errors sit under the field, in place, never only in a toast.
const Field = ({ label, error, hint, counter, className, as = 'input', ...props }) => {
  const id = useId();
  const Tag = as;
  return (
    <div className={cn('mb-6', className)}>
      <label htmlFor={id} className="caps mb-1 block text-[11px] font-bold text-ink-soft">
        {label}
      </label>
      <Tag
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
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
          error ? 'border-out' : 'border-ink',
        )}
        {...props}
      />
      {(error || hint || counter != null) && (
        <div className="mt-1 flex justify-between gap-2">
          <span
            id={`${id}-note`}
            role={error ? 'alert' : undefined}
            className={cn('text-[13px]', error ? 'text-ink' : 'text-ink-soft')}
          >
            {error || hint}
          </span>
          {counter != null && <span className="num text-[11px] text-ink-soft">{counter}</span>}
        </div>
      )}
    </div>
  );
};

export default Field;
