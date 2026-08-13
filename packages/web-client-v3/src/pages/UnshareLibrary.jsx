import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { Check } from '@/components/icons';
import { librariesApi } from '@/api';
import { useLibraries } from '@/state/LibrariesContext.jsx';

// The API takes 1-10 emails per request.
const MAX_PER_REQUEST = 10;

const UnshareLibrary = () => {
  const { libraryId } = useParams();
  const { byId, refresh } = useLibraries();
  const library = byId(libraryId);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const navigate = useNavigate();

  const recipients = library?.sharedTo ?? [];
  const tooMany = selected.length > MAX_PER_REQUEST;

  const toggle = (email) =>
    setSelected((current) =>
      current.includes(email) ? current.filter((e) => e !== email) : [...current, email],
    );

  const onSubmit = async () => {
    setError(null);
    setIsBusy(true);
    try {
      await librariesApi.unshare(libraryId, selected);
      await refresh();
      navigate('/libraries');
    } catch (err) {
      setError(
        `${err.message} These readers may still have access: ${selected.join(', ')}. Check the list and try again.`,
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <AppHeader title="Unshare" onBack={() => navigate(-1)} search={false} />

      <div className="flex-1">
        {error && (
          <p role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-sm">
            {error}
          </p>
        )}

        {recipients.length === 0 && (
          <p className="caps p-4 text-xs text-ink-soft">This library is not shared with anyone</p>
        )}

        {recipients.map((email) => {
          const isSelected = selected.includes(email);
          return (
            <button
              key={email}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(email)}
              className="flex min-h-12 w-full items-center gap-4 border-b border-ink p-4 text-left"
            >
              {/* Selection is the imprint's active state: a plate, not a colour wash. */}
              <span
                aria-hidden="true"
                className={`flex size-6 shrink-0 items-center justify-center border-2 border-ink ${
                  isSelected ? 'on-imprint bg-imprint text-ink' : 'bg-transparent'
                }`}
              >
                {isSelected && <Check size={16} />}
              </span>
              {/* An address is content, so it keeps its own case. */}
              <span className="num min-w-0 flex-1 truncate text-sm">{email}</span>
            </button>
          );
        })}
      </div>

      <div className="pad-bottom-safe border-t-2 border-ink p-4">
        {tooMany && (
          <p role="alert" className="mb-4 text-sm">
            {selected.length} selected — the API removes 10 at a time. Deselect{' '}
            {selected.length - MAX_PER_REQUEST} and repeat for the rest.
          </p>
        )}
        {/* With nothing selected the action is absent, not disabled. */}
        {selected.length > 0 && (
          <PlateButton variant="danger" disabled={isBusy || tooMany} onClick={onSubmit}>
            {isBusy ? 'Removing' : `Remove ${selected.length}`}
          </PlateButton>
        )}
      </div>
    </div>
  );
};

export default UnshareLibrary;
