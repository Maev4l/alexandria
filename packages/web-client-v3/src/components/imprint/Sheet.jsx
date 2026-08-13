import { useEffect, useId, useRef } from 'react';

// Bottom sheet on the recessed field with a 3px top rule and square corners. Rises from the
// bottom edge in 200ms, linear — the press, not a spring.
const Sheet = ({ open, title, onClose, children }) => {
  const titleId = useId();
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    panel.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        data-testid="sheet-scrim"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-ink/40"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="pad-bottom-safe max-h-[80dvh] overflow-y-auto border-t-[3px] border-ink bg-paper-deep p-4 outline-none motion-safe:animate-[sheet-rise_var(--press-sheet)_linear]"
      >
        <h2 id={titleId} className="caps mb-4 text-[11px] text-ink-soft">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
};

export default Sheet;
