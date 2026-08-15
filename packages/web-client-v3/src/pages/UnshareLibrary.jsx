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
  // Revoking another person's access is at least as consequential as deleting your own library,
  // and delete confirms in place. This used to fire on the first tap.
  const [isConfirming, setIsConfirming] = useState(false);
  const navigate = useNavigate();

  const recipients = library?.sharedTo ?? [];
  const tooMany = selected.length > MAX_PER_REQUEST;

  const toggle = (email) =>
    setSelected((current) => {
      // Changing the selection invalidates a confirmation about the old one.
      setIsConfirming(false);
      return current.includes(email) ? current.filter((e) => e !== email) : [...current, email];
    });

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
    <div className="flex h-dvh flex-col bg-paper">
      {/* The library is named here, not just implied by where the reader came from: this
          route survives a refresh and a PWA restart, and it is a destructive screen. */}
      <AppHeader
        title={library ? `Unshare ${library.name}` : 'Unshare'}
        onBack={() => navigate(-1)}
        search={false}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && (
          <p role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-sm">
            {error}
          </p>
        )}

        {recipients.length === 0 && (
          <p className="caps p-4 text-xs font-bold text-ink-soft">This library is not shared with anyone</p>
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

      {/* The bar keeps its height whether or not there is an action in it, so the content
          above never jumps. "Absent, not disabled" is about what a reader MAY not do; here
          they may act and simply have not chosen yet, so the space says what to do next
          rather than sitting empty and reading as a rendering failure. */}
      <div className="pad-bottom-safe flex min-h-20 flex-col justify-center border-t-2 border-ink p-4">
        {recipients.length === 0 ? null : selected.length === 0 ? (
          <p className="caps text-[11px] font-bold text-ink-soft">Select who to remove</p>
        ) : tooMany ? (
          <p role="alert" className="text-sm">
            {selected.length} selected — the API removes {MAX_PER_REQUEST} at a time. Deselect{' '}
            {selected.length - MAX_PER_REQUEST} and repeat for the rest.
          </p>
        ) : isConfirming ? (
          <>
            {/* Say what the action does, before it is taken, in place — the same discipline the
                delete confirmations follow. Names the people, because "1 reader" is not what the
                owner is deciding about. */}
            <p className="mb-2 text-sm">
              <strong>{selected.join(', ')}</strong> will lose access to {library?.name}. You can
              share it with them again later.
            </p>
            <div className="flex gap-2">
              <PlateButton variant="danger" disabled={isBusy} onClick={onSubmit}>
                {isBusy ? 'Removing' : 'Remove for good'}
              </PlateButton>
              <PlateButton variant="secondary" onClick={() => setIsConfirming(false)}>
                Keep access
              </PlateButton>
            </div>
          </>
        ) : (
          <PlateButton
            variant="danger"
            disabled={isBusy}
            onClick={() => setIsConfirming(true)}
            className="self-start"
          >
            {`Remove ${selected.length}`}
          </PlateButton>
        )}
      </div>
    </div>
  );
};

export default UnshareLibrary;
