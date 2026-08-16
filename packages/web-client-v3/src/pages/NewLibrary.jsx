import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { librariesApi } from '@/api';
import { useLibraries } from '@/state/LibrariesContext.jsx';

const NAME_MAX = 20;
const DESCRIPTION_MAX = 100;

const NewLibrary = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const { refresh } = useLibraries();
  const navigate = useNavigate();

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsBusy(true);
    try {
      await librariesApi.create({ name, description });
      await refresh();
      navigate('/libraries');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader title="New library" onBack={() => navigate(-1)} search={false} />
      <main>
        {/* The header already shows this title visibly, so the <h1> duplicating it stays
            hidden — nothing is labelled twice. */}
        <h1 className="sr-only">New library</h1>
        <form className="p-4" onSubmit={onSubmit} noValidate>
          {error && (
            <p role="alert" className="mb-6 border-t-2 border-out bg-paper-deep p-4 text-sm text-ink">
              {error}
            </p>
          )}
          {/* Both limits are short enough to hit, so the count is shown rather than the field
              silently refusing the next keystroke. */}
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
            {isBusy ? 'Creating' : 'Create library'}
          </PlateButton>
        </form>
      </main>
    </div>
  );
};

export default NewLibrary;
