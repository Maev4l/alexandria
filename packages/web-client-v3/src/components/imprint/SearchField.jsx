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
const SearchField = ({ className }) => {
  const [terms, setTerms] = useState('');
  const navigate = useNavigate();

  const submit = (event) => {
    event.preventDefault();
    // Carries what has been typed, so the reader never types it twice.
    navigate(terms.trim() ? `/search?q=${encodeURIComponent(terms.trim())}` : '/search');
  };

  return (
    <form
      role="search"
      onSubmit={submit}
      className={`mt-3 flex min-h-12 items-center gap-2 border-2 border-ink bg-imprint px-2 ${className ?? ''}`}
    >
      <input
        type="search"
        value={terms}
        onChange={(event) => setTerms(event.target.value)}
        aria-label="Search every library"
        placeholder="Search every library"
        // No inner ring: the field's own 2px ink rule and the outer focus ring already bound it.
        className="on-imprint min-h-12 min-w-0 flex-1 bg-transparent text-[13px] font-normal text-ink placeholder:text-ink"
      />
      <button
        type="submit"
        aria-label="Search"
        className="on-imprint flex size-8 shrink-0 items-center justify-center text-ink"
      >
        <Search size={16} />
      </button>
    </form>
  );
};

export default SearchField;
