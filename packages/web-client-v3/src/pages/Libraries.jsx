import { Link, useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import LibraryRow from '@/components/LibraryRow.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import PullToRefresh from '@/components/PullToRefresh.jsx';
import { useLibraries } from '@/state/LibrariesContext.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';

// Index letters are separators, not headings; so are these section heads. Exposing them as
// separators keeps the screen's heading outline honest.
const StreamHead = ({ label, count }) => (
  <div
    role="separator"
    className="flex items-center justify-between border-b border-ink px-4 pb-1 pt-4 text-[11px] font-extrabold uppercase tracking-[0.16em]"
  >
    <span>{label}</span>
    <span className="num tracking-normal text-ink-soft">{count}</span>
  </div>
);

// A ruled frame at the right proportions, so the layout does not move when content lands.
const SkeletonRow = () => (
  <div className="flex items-start gap-4 border-b-2 border-ink p-4" aria-hidden="true">
    <span className="block h-6 w-14 bg-paper-deep" />
    <span className="flex-1">
      <span className="block h-6 w-2/3 bg-paper-deep" />
      <span className="mt-1 block h-3 w-1/3 bg-paper-deep" />
    </span>
  </div>
);

const Libraries = () => {
  const { owned, sharedWithMe, isLoading, error, refresh } = useLibraries();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <AppHeader
        wordmark
        right={
          // A tap, not a label, so it takes the 48px minimum like the search field.
          <Link
            to="/settings"
            aria-label={`Account — ${user?.email ?? 'signed in'}`}
            className="caps on-imprint flex min-h-12 min-w-12 items-center justify-center bg-imprint px-2 text-[11px] text-ink"
          >
            {user?.initials ?? '—'}
          </Link>
        }
      />

      <PullToRefresh onRefresh={refresh} className="flex-1">
        {error && (
          <p role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-sm">
            {error} Pull down to try again.
          </p>
        )}

        {isLoading && !error && (
          <>
            <StreamHead label="Mine" count="—" />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        )}

        {!isLoading && !error && (
          <>
            <StreamHead label="Mine" count={owned.length} />
            {owned.length === 0 && (
              <p className="caps border-b-2 border-ink p-4 text-xs text-ink-soft">
                No libraries yet — start one below
              </p>
            )}
            {owned.map((library) => (
              <LibraryRow key={library.id} library={library} onActions={() => {}} />
            ))}

            {sharedWithMe.length > 0 && (
              <>
                <StreamHead label="Shared with me" count={sharedWithMe.length} />
                {/* No actions: read-only means the affordance is absent, not disabled. */}
                {sharedWithMe.map((library) => (
                  <LibraryRow key={library.id} library={library} />
                ))}
              </>
            )}
          </>
        )}
      </PullToRefresh>

      <div className="pad-bottom-safe border-t-2 border-ink bg-paper p-4">
        <PlateButton onClick={() => navigate('/libraries/new')}>New library</PlateButton>
      </div>
    </div>
  );
};

export default Libraries;
