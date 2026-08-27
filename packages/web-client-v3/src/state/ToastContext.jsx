import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

const VISIBLE_MS = 4000;

// CONFIRMATIONS ONLY. A toast never carries a failure and never carries the only report of a
// destructive action: failures are inline and in place, where the reader is looking and where
// they can retry, and destructive actions confirm BEFORE they happen. A toast says "that
// worked" to someone who has already moved on, and nothing else.
export const ToastProvider = ({ children }) => {
  const [message, setMessage] = useState(null);

  const confirm = useCallback((text) => {
    setMessage({ text, id: Symbol('toast') });
    setTimeout(() => setMessage((current) => (current?.text === text ? null : current)), VISIBLE_MS);
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* aria-live rather than role=alert: this is an aside, not an interruption. */}
      <div
        aria-live="polite"
        className="pad-bottom-safe pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-4"
      >
        {/* NOT `caps`. A confirmation is an interface sentence but it EMBEDS content — the item's
            title and a person's name — and content is never uppercased. "AURORE IS OUT WITH
            MARIE" shouts a French title and someone's name, which is the same defect as the
            sheet heading, one layer further in. Sentence case, in the sans. */}
        {message && (
          <p
            data-toast=""
            className="border-t-[3px] border-ink bg-paper-deep p-4 text-sm font-semibold text-ink"
          >
            {message.text}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside a ToastProvider');
  return value;
};
