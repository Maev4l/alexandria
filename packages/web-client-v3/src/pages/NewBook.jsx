import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import ItemForm from '@/components/ItemForm.jsx';
import { collectionsApi, itemsApi } from '@/api';
import { seedFromAddFlowState } from '@/lib/addFlowState.js';

const BOOK = 0;

// Manual entry, reached either from AddBook's own "Enter by hand" escape or as the fallback
// when ISBN detection finds nothing (see AddBook). No item exists yet, so `initial` starts
// from whatever the previous screen already knew — the query string, `?collectionId=` —
// rather than nothing: arriving from a collection board's "Add an item" must not silently drop
// the collection the reader just named, leaving them to notice and re-pick it from the
// dropdown. The query, not `location.state`: state is gone on a cold load (a fresh tab, a deep
// link, a PWA restart resuming this exact URL), which is exactly when the loss would be silent.
const NewBook = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    let cancelled = false;
    // Best-effort: a collection picker with no options is a smaller loss than blocking a
    // reader who came here to add a book from ever seeing the form.
    collectionsApi
      .list(libraryId)
      .then((response) => {
        if (!cancelled) setCollections(response?.collections ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [libraryId]);

  const onSubmit = async (payload) => {
    const created = await itemsApi.createBook(libraryId, payload);
    navigate(`/libraries/${libraryId}/items/${created.id}`);
  };

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <AppHeader title="New book" onBack={() => navigate(-1)} search={false} />
      <main
        data-scroll-region
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <h1 className="sr-only">New book</h1>
        <ItemForm
          type={BOOK}
          initial={seedFromAddFlowState(location.search)}
          collections={collections}
          onSubmit={onSubmit}
          submitLabel="Add book"
        />
      </main>
    </div>
  );
};

export default NewBook;
