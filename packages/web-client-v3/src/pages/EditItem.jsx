import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import ItemForm from '@/components/ItemForm.jsx';
import { collectionsApi, itemsApi } from '@/api';

const FILM = 1;

const EditItem = () => {
  const { libraryId, itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [collections, setCollections] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    // Collections are fetched alongside the item rather than blocking on it: the collection
    // picker is a secondary control, and an empty list here just means "no collections yet",
    // never a reason to keep the reader off a form they came to fill in.
    Promise.all([itemsApi.get(libraryId, itemId), collectionsApi.list(libraryId).catch(() => null)])
      .then(([fetchedItem, collectionsResponse]) => {
        if (cancelled) return;
        setItem(fetchedItem);
        setCollections(collectionsResponse?.collections ?? []);
        setStatus('ready');
      })
      .catch((err) => {
        if (!cancelled) setStatus(err.status === 404 ? 'missing' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [libraryId, itemId]);

  const onSubmit = async (payload) => {
    const update = item.type === FILM ? itemsApi.updateVideo : itemsApi.updateBook;
    await update(libraryId, itemId, payload);
    // PUT returns an empty body, so success is never assumed from the response alone: this
    // re-read is the confirmation that the write actually landed, before the reader is sent
    // anywhere. ItemDetail performs its own independent fetch on mount regardless (a route
    // change unmounts this page), so the value here is deliberately discarded — its only job
    // is to fail loudly, in place on this form, rather than navigate on a write that silently
    // did not take.
    await itemsApi.get(libraryId, itemId);
    navigate(`/libraries/${libraryId}/items/${itemId}`);
  };

  if (status === 'missing' || status === 'error') {
    return (
      <div className="min-h-dvh bg-paper">
        <AppHeader title="Not found" onBack={() => navigate(-1)} search={false} />
        <main className="p-4">
          <h1 className="sr-only">Edit item</h1>
          <p role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
            {status === 'missing'
              ? 'That item is not in this library any more.'
              : 'Could not load this item. Check your connection and try again.'}
          </p>
        </main>
      </div>
    );
  }

  const title = item ? `Edit ${item.type === FILM ? 'film' : 'book'}` : 'Edit item';

  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader title={title} onBack={() => navigate(-1)} search={false} />
      <main className="p-4">
        {/* The header already carries the name once the item has loaded; while it is still
            "Edit item" this doubles as the visible title too, so nothing is hidden twice. */}
        <h1 className="sr-only">{title}</h1>
        {status === 'ready' && item && (
          <ItemForm
            type={item.type}
            initial={item}
            collections={collections}
            onSubmit={onSubmit}
            submitLabel="Save changes"
          />
        )}
      </main>
    </div>
  );
};

export default EditItem;
