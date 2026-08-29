import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import ItemForm from '@/components/ItemForm.jsx';
import { collectionsApi, itemsApi } from '@/api';

const FILM = 1;

const EditItem = () => {
  const { libraryId, itemId } = useParams();
  const navigate = useNavigate();
  // THE TYPE ARRIVES BEFORE THE ITEM DOES, on every path a reader actually takes. Both openers
  // (`ItemActionsSheet`, `ItemDetail`) hold the whole record when they navigate here, so they
  // hand the type over and this screen can print its real name on its first frame.
  //
  // It rides in `location.state` rather than the query because it is not an IDENTIFYING input:
  // the URL alone still resolves this screen, and the fetch below re-establishes the type as
  // fact. That is the distinction ui-v3.md draws for the add flow, where the code being looked
  // up MUST survive a cold load and therefore may not travel here — state carries what is safely
  // recoverable, and this is recoverable by definition, from the request we make anyway.
  const { state: openerState } = useLocation();
  const hintedType = openerState?.type;
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
      <div className="flex h-dvh flex-col bg-paper">
        <AppHeader title="Not found" onBack={() => navigate(-1)} search={false} />
        <main
        data-scroll-region
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
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

  // The FETCHED type wins wherever both exist — the hint is an optimisation, never the record.
  // `??` and not `||`, because a book is type 0 and would fall straight through a truthiness test
  // into the film branch.
  const knownType = item?.type ?? hintedType;

  // NOTHING, not a guess, when the type is genuinely unknown — a cold load or a refresh, where
  // there is no opener to have supplied it. The header used to print `Edit item` here and then
  // swap it for `Edit book`, which the reader sees as a flicker of the app correcting itself;
  // an empty title that fills in is the construction LibraryBrowse already uses for a library
  // name it has not fetched yet. The <h1> below keeps a real word in that gap, because a landmark
  // with no accessible name is a defect where a header with no title is merely quiet.
  const title = knownType == null ? '' : `Edit ${knownType === FILM ? 'film' : 'book'}`;

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <AppHeader title={title} onBack={() => navigate(-1)} search={false} />
      <main
        data-scroll-region
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {/* Visually hidden because the header carries the name — except in the one gap where it
            does not, a cold load before the type is known, and there this is the only thing
            naming the screen. Hence the fallback: an empty <h1> would leave the landmark
            unnamed. */}
        <h1 className="sr-only">{title || 'Edit item'}</h1>
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
