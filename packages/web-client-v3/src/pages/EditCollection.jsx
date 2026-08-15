import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { collectionsApi } from '@/api';

const NAME_MAX = 100;
const DESCRIPTION_MAX = 500;
const DUPLICATE = /already exists/i;

const EditCollection = () => {
  const { libraryId, collectionId } = useParams();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('loading');
  const [isBusy, setIsBusy] = useState(false);
  const navigate = useNavigate();

  // The collection endpoint returns a HEADER only — name, description, itemCount — never its
  // members. That is exactly enough for this screen, which is why editing a collection works
  // from a cold deep link while a collection DETAIL view could not.
  useEffect(() => {
    let cancelled = false;
    collectionsApi
      .get(libraryId, collectionId)
      .then((collection) => {
        if (cancelled) return;
        setName(collection?.name ?? '');
        setDescription(collection?.description ?? '');
        setStatus('ready');
      })
      .catch((err) => {
        if (!cancelled) setStatus(err.status === 404 ? 'missing' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [libraryId, collectionId]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setNameError(null);
    setIsBusy(true);
    try {
      await collectionsApi.update(libraryId, collectionId, { name, description });
      // A rename propagates to member items through a stream, so the stream is re-read on
      // arrival rather than patched here.
      navigate(`/libraries/${libraryId}`);
    } catch (err) {
      if (err.status === 400 && DUPLICATE.test(err.message)) {
        setNameError(`There is already a collection called “${name}” in this library.`);
      } else {
        setError(err.message);
      }
    } finally {
      setIsBusy(false);
    }
  };

  if (status === 'missing' || status === 'error') {
    return (
      <div className="min-h-dvh bg-paper">
        <AppHeader
          title="Not found"
          onBack={() => navigate(`/libraries/${libraryId}`)}
          search={false}
        />
        <p role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
          {status === 'missing'
            ? 'That collection is not in this library any more.'
            : 'Could not load that collection. Check your connection and try again.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader title="Edit collection" onBack={() => navigate(-1)} search={false} />
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
          error={nameError}
          hint="Unique within this library."
          onChange={(event) => {
            setName(event.target.value);
            setNameError(null);
          }}
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
    </div>
  );
};

export default EditCollection;
