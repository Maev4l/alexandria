import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import ItemForm from '@/components/ItemForm.jsx';
import { collectionsApi, itemsApi } from '@/api';

const FILM = 1;

// Manual entry, reached either from AddItemSheet's "Enter by hand" or as the fallback when
// cover-OCR + TMDB search finds nothing (DESIGN.md, AddVideo). No item exists yet, so `initial`
// is empty.
const NewVideo = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    let cancelled = false;
    // Best-effort: a collection picker with no options is a smaller loss than blocking a
    // reader who came here to add a film from ever seeing the form.
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
    const created = await itemsApi.createVideo(libraryId, payload);
    navigate(`/libraries/${libraryId}/items/${created.id}`);
  };

  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader title="New film" onBack={() => navigate(-1)} search={false} />
      <main className="p-4">
        <h1 className="sr-only">New film</h1>
        <ItemForm type={FILM} initial={{}} collections={collections} onSubmit={onSubmit} submitLabel="Add film" />
      </main>
    </div>
  );
};

export default NewVideo;
