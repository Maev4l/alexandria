import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { seedFromAddFlowState } from '@/lib/addFlowState.js';

// Placeholder — replaced by its own task in the implementation plan. Still gets a real landmark
// and heading now: a stub is still a screen a reader can land on, and retrofitting this once the
// build catches up costs more than writing it alongside the stub.
//
// `onBack` is not decoration: this screen is reached by pressing "+" inside a library, and
// installed as a standalone PWA there is no browser chrome and no back gesture — without it,
// the app's own cataloguing flow began at a dead end (see the critique this fixes).
//
// The one working control on this stub: the manual escape to NewBook that used to live in
// AddItemSheet as "Enter by hand", moved here because it needs a type (book) to mean anything —
// AddItemSheet only ever offered a type, never assumed one, and Enter by hand broke that. The
// collection travels as `?collectionId=`, read from THIS screen's own query rather than
// forwarded from memory, because this screen may itself be a cold load (a fresh tab, a deep
// link, a PWA restart) by the time a reader reaches the button.
const AddBook = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { collectionId } = seedFromAddFlowState(location.search);
  const manualEntryPath = `/libraries/${libraryId}/items/new/book${
    collectionId ? `?collectionId=${encodeURIComponent(collectionId)}` : ''
  }`;

  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader wordmark onBack={() => navigate(-1)} search={false} />
      <main className="p-4">
        <h1 className="sr-only">Add a book</h1>
        <p className="caps text-xs font-bold text-ink-soft">AddBook — not built</p>
        <PlateButton
          variant="secondary"
          className="mt-4"
          onClick={() => navigate(manualEntryPath)}
        >
          Enter by hand
        </PlateButton>
      </main>
    </div>
  );
};

export default AddBook;
