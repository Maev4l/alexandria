import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { librariesApi } from '@/api';
import { useLibraries } from '@/state/LibrariesContext.jsx';

const NAME_MAX = 20;
const DESCRIPTION_MAX = 100;

const EditLibrary = () => {
  const { libraryId } = useParams();
  const { byId, refresh, isLoading } = useLibraries();
  const library = byId(libraryId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const navigate = useNavigate();

  // The list may still be loading on a cold deep link, so seed once it arrives.
  useEffect(() => {
    if (!library) return;
    setName(library.name ?? '');
    setDescription(library.description ?? '');
  }, [library]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsBusy(true);
    try {
      await librariesApi.update(libraryId, { name, description });
      // A rename propagates to items through a stream, so the list is re-read rather than
      // patched: what comes back is what the server actually holds.
      await refresh();
      navigate('/libraries');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  if (!isLoading && !library) {
    return (
      <div className="min-h-dvh bg-paper">
        <AppHeader title="Not found" onBack={() => navigate('/libraries')} search={false} />
        <main className="p-4">
          <h1 className="sr-only">Not found</h1>
          <p role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
            That library is not in your collection any more.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader title="Edit library" onBack={() => navigate(-1)} search={false} />
      <main>
        {/* The header already shows this title visibly, so the <h1> duplicating it stays
            hidden — nothing is labelled twice. */}
        <h1 className="sr-only">Edit library</h1>
        <form className="p-4" onSubmit={onSubmit} noValidate>
          {error && (
            <p role="alert" className="mb-6 border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
              {error}
            </p>
          )}
          <Field
            label="Name"
            maxLength={NAME_MAX}
            counter={NAME_MAX - name.length}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Field
            label="Description"
            as="textarea"
            rows={3}
            maxLength={DESCRIPTION_MAX}
            counter={DESCRIPTION_MAX - description.length}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <PlateButton type="submit" disabled={isBusy || !name.trim()}>
            {isBusy ? 'Saving' : 'Save changes'}
          </PlateButton>
        </form>
      </main>
    </div>
  );
};

export default EditLibrary;
