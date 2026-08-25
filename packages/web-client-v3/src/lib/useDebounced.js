import { useEffect, useState } from 'react';

// 300ms, per ui-v3.md § Search. Long enough that an ordinary typing run costs one request
// rather than one per keystroke; short enough that a reader who pauses does not think the
// screen has stopped.
export const DEBOUNCE_MS = 300;

// Returns the SETTLED value — what `value` was last set to and then left alone for `delay`.
//
// The initial value settles immediately (it seeds the state rather than waiting out a first
// timer), which is what makes a deep link carrying `?q=` search on arrival instead of showing
// an empty screen for 300ms with the query already visible in the field.
const useDebounced = (value, delay = DEBOUNCE_MS) => {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
};

export default useDebounced;
