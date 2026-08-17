import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { collectionsApi } from '@/api';

const NAME_MAX = 100;
const DESCRIPTION_MAX = 500;

const NewCollection = () => {
  const { libraryId } = useParams();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState(null);
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setNameError(null);
    setIsBusy(true);
    try {
      await collectionsApi.create(libraryId, { name, description });
      navigate(`/libraries/${libraryId}`);
    } catch (err) {
      // A duplicate name is a fact about the field, so it belongs on the field — not in a
      // page-level alert the reader has to map back to an input themselves. 409 is this API's
      // ONLY status for it (handlers/collections.go), matched on the status rather than sniffing
      // `err.message` for the server's wording — the client no longer carries that wording at
      // all (api/client.js), and matching text that used to say "already exists" would have
      // silently stopped firing the moment that map shipped.
      if (err.status === 409) {
        setNameError(`There is already a collection called “${name}” in this library.`);
      } else {
        setError(err.message);
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader title="New collection" onBack={() => navigate(-1)} search={false} />
      <main>
        {/* The header already shows this title visibly, so the <h1> duplicating it stays
            hidden — nothing is labelled twice. */}
        <h1 className="sr-only">New collection</h1>
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
            {isBusy ? 'Creating' : 'Create collection'}
          </PlateButton>
        </form>
      </main>
    </div>
  );
};

export default NewCollection;
