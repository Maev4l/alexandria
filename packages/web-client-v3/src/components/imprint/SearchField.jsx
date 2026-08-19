import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from '@/components/icons';

// A real input, not a link costumed as one. It was previously a <Link> with the box, the
// placeholder grey and the magnifier, and it accepted no keystroke — which inverted the product's
// first principle: lookup is the front door, and the front door did not open.
//
// It takes the --imprint ground because yellow marks the apparatus of finding and acting, and on
// this screen finding is the dominant job. Placeholder at REGULAR weight deliberately: bold ink
// on saturated yellow reads as a button you press rather than a field you type in.
// Two mounts, ONE construction. Pinned in the header on the libraries root, where it is a link
// with a keyboard: typing and submitting carries the query to /search. Mounted again on the
// search surface itself, where the query is already live and there is nowhere to navigate to —
// supplying `onQueryChange` puts it in that CONTROLLED mode.
//
// Not two components: the ground, the rule, the 48px floor and — the part that would rot
// silently — the `focus-control` indicator (index.css RULING 3: the whole control indicates, the
// inner input does not) are all decisions this file owns. A second field costumed to match would
// diverge from them the first time any one moved.
const SearchField = ({ className, value, onQueryChange }) => {
  const [typed, setTyped] = useState('');
  const navigate = useNavigate();
  const isControlled = onQueryChange != null;
  const terms = isControlled ? (value ?? '') : typed;

  const submit = (event) => {
    event.preventDefault();
    // On the search surface the debounced query is already running, so submitting has nowhere
    // to go — it only dismisses the phone keyboard, which is exactly what a reader expects of
    // the return key there. Navigating would push /search onto itself and cost them a step of
    // history, on the one screen whose exit is a `history.back()`.
    if (isControlled) return;
    // Carries what has been typed, so the reader never types it twice.
    navigate(terms.trim() ? `/search?q=${encodeURIComponent(terms.trim())}` : '/search');
  };

  return (
    <form
      role="search"
      onSubmit={submit}
      className={`focus-control mt-3 flex min-h-12 items-center gap-2 border-2 border-ink bg-imprint px-2 ${className ?? ''}`}
    >
      <input
        type="search"
        value={terms}
        onChange={(event) => (isControlled ? onQueryChange(event.target.value) : setTyped(event.target.value))}
        aria-label="Search every library"
        placeholder="Search every library"
        // No inner ring, and now that is TRUE: `on-imprint` used to be here, which is precisely
        // what gave the input a ring of its own, so the comment claimed one thing while the code
        // did the opposite. The indicator lives on the whole control (`focus-control`) because
        // that is the thing a reader sees.
        className="min-h-12 min-w-0 flex-1 bg-transparent text-[13px] font-normal text-ink placeholder:text-ink"
      />
      <button
        type="submit"
        aria-label="Search"
        // 48px floor (P1 #4): the field's own row is already 48px tall because the input
        // above carries the same min-h-12, so growing this from a 32px icon square to the
        // full size-12 box costs nothing — it only ever consumed slack that was already
        // sitting unused inside the row, never inflating it. The icon itself stays 16px;
        // only the tappable box grows.
        className="on-imprint flex size-12 shrink-0 items-center justify-center text-ink"
      >
        <Search size={16} />
      </button>
    </form>
  );
};

export default SearchField;
