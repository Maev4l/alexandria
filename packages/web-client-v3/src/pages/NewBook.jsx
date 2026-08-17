import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import ItemForm from '@/components/ItemForm.jsx';
import { collectionsApi, itemsApi } from '@/api';
import { seedFromAddFlowState } from '@/lib/addFlowState.js';

const BOOK = 0;

// Manual entry, reached either from AddItemSheet's "Enter by hand" or as the fallback when
// ISBN detection finds nothing (DESIGN.md, AddBook). No item exists yet, so `initial` starts
// from whatever the previous screen already knew — `location.state` — rather than nothing:
// arriving from a collection board's "Add an item" must not silently drop the collection the
// reader just named, leaving them to notice and re-pick it from the dropdown.
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
    <div className="min-h-dvh bg-paper">
      <AppHeader title="New book" onBack={() => navigate(-1)} search={false} />
      <main className="p-4">
        <h1 className="sr-only">New book</h1>
        <ItemForm
          type={BOOK}
          initial={seedFromAddFlowState(location.state)}
          collections={collections}
          onSubmit={onSubmit}
          submitLabel="Add book"
        />
      </main>
    </div>
  );
};

export default NewBook;
