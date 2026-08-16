import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';

// Placeholder — replaced by its own task in the implementation plan.
//
// NOT a placeholder: the exit. The Search Field is deliberately the loudest mark in the whole
// design (DESIGN.md, "Where the yellow goes") because lookup is the product's dominant job
// (PRODUCT.md) — which makes this the single most-tapped route in the app, from a reader who is
// very likely one-handed, in a hurry, and installed as a PWA with no browser chrome to fall back
// on. A stub with no way out turned the app's own front door into a trap for three slices (see
// the critique this fixes). `onBack` is the same mechanism ItemDetail already uses for the same
// reason — a real `history.back()`, not a hardcoded destination, so it returns wherever the
// reader actually came from (the libraries root or an item's cover).
const Search = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-paper">
      {/* No wordmark: that's reserved for the libraries root (DESIGN.md's header table). This
          screen is reached BY the pinned field, so its own header is just the way back — the
          same "onBack, no title" shape ItemDetail's own non-happy-path states already use. */}
      <AppHeader onBack={() => navigate(-1)} search={false} />
      <main className="p-4">
        {/* The header carries no title here (just the back control), so the landmark still
            needs its own accessible name — visually hidden, since the notice below already
            says what this screen is in the reader's eye line. */}
        <h1 className="sr-only">Search</h1>
        <p className="caps text-xs font-bold text-ink-soft">Search — arrives next</p>
      </main>
    </div>
  );
};

export default Search;
