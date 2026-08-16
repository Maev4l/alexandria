import AppHeader from '@/components/AppHeader.jsx';

// Placeholder — replaced by its own task in the implementation plan. Still gets a real landmark
// and heading now: a stub is still a screen a reader can land on, and retrofitting this once the
// build catches up costs more than writing it alongside the stub.
const AddBook = () => (
  <div className="min-h-dvh bg-paper">
    <AppHeader wordmark search={false} />
    <main className="p-4">
      <h1 className="sr-only">Add a book</h1>
      <p className="caps text-xs font-bold text-ink-soft">AddBook — not built</p>
    </main>
  </div>
);

export default AddBook;
