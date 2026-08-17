import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';

// Placeholder — replaced by its own task in the implementation plan. Still gets a real landmark
// and heading now: a stub is still a screen a reader can land on, and retrofitting this once the
// build catches up costs more than writing it alongside the stub.
//
// `onBack` is not decoration: this screen is reached by pressing "+" inside a library, and
// installed as a standalone PWA there is no browser chrome and no back gesture — without it,
// the app's own cataloguing flow began at a dead end (see the critique this fixes).
const AddBook = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader wordmark onBack={() => navigate(-1)} search={false} />
      <main className="p-4">
        <h1 className="sr-only">Add a book</h1>
        <p className="caps text-xs font-bold text-ink-soft">AddBook — not built</p>
      </main>
    </div>
  );
};

export default AddBook;
