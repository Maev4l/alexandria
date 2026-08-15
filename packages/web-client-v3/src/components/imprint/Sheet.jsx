import { useEffect, useId, useRef } from 'react';
import { Close } from '@/components/icons/index.jsx';

// Bottom sheet on the recessed field with a 3px top rule and square corners. Rises from the
// bottom edge in 200ms, linear — the press, not a spring.
const Sheet = ({ open, title, onClose, children }) => {
  const titleId = useId();
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    // Remember what opened this, so focus can go back there rather than to <body>. After
    // "Delete for good" the trigger is gone with its row, and document.body is where focus
    // lands by default — which strands a keyboard reader at the top of a rebuilt stream.
    const opener = document.activeElement;
    // aria-modal="true" is a PROMISE that nothing outside this dialog is reachable. Without a
    // trap it is a lie: Tab walks into the page behind, where assistive tech has been told there
    // is nothing, and the reader is stranded somewhere they cannot perceive. The attribute and
    // the behaviour have to agree.
    //
    // Queried on each keypress rather than once: a sheet's controls change as its mode does —
    // menu, lend, delete — so a list captured at open would be stale the moment the reader picks
    // an action.
    // No visibility filter. An earlier version excluded elements with a null offsetParent,
    // which jsdom returns for EVERYTHING — so every trap test passed through the degenerate
    // "nothing focusable" branch below and never exercised the wrapping at all. The filter also
    // bought nothing: a sheet renders only the current mode's controls, so it has no hidden
    // focusables, and the scrim lives outside the panel.
    const focusable = () => [
      ...(panel.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? []),
    ];

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusable();
      // Nothing focusable inside: keep focus on the panel rather than releasing it to the page.
      if (items.length === 0) {
        event.preventDefault();
        panel.current?.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      // The panel itself holds focus when the sheet opens, and it CONTAINS itself — so a
      // `contains` test alone reads it as "already inside, no wrap needed" and Shift+Tab walks
      // straight out the back. It has to count as sitting before the first control.
      const atStart = active === first || active === panel.current;
      const outside = !panel.current?.contains(active);

      if (event.shiftKey && (atStart || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
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
        // Constrained and centred like the column it belongs to: a full-bleed sheet under a
        // 448px column would be a different app at 1440px.
        //
        // `text-ink` is NOT decoration — it is the other half of `bg-paper-deep`. Anything that
        // sets a ground must set its foreground in the same rule (DESIGN.md §2): a sheet is
        // correct wherever it opens on a normal paper screen (ambient text is already ink) and
        // was unreadable on the one screen that inverts it (item detail's black cover sets
        // `text-paper` on an ancestor, which a plain paragraph or a `text-current` secondary
        // button then inherited straight through the sheet's own background, ~1.08:1).
        className="pad-bottom-safe mx-auto max-h-[80dvh] w-full max-w-md overflow-y-auto border-t-[3px] border-ink bg-paper-deep p-4 text-ink motion-safe:animate-[sheet-rise_var(--press-sheet)_linear]"
      >
        {/* No `caps` here. A sheet's title is usually a content name — the library or item
            being acted on — and content is never uppercased (§3): the rule exists because
            this collection's titles are mixed English and French, and "BANDES DESSINÉES"
            set in caps is exactly what it forbids.

            Set at the Row Title step, 17/600, because the sheet is about the row it was
            opened from: the reader's eye lands on the same object at the same volume, and the
            sheet reads as that row expanded rather than as a screen with its own typography. */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-[17px] font-semibold text-ink">
            {title}
          </h2>
          {/* INSIDE the dialog, deliberately. The scrim is a real button with an accessible
              name, but it is a SIBLING of this panel and the panel is aria-modal, so assistive
              tech hides everything outside it — the scrim included. That left Escape as the only
              exposed route, and a phone has no Escape key. A visible mark duplicating a gesture
              is the same rule that governs long-press; leaving a sheet is not exempt from it. */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-m-2 flex min-h-12 min-w-12 items-center justify-center p-2 text-ink"
          >
            <Close />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Sheet;
