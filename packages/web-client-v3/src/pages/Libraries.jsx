import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import LibraryRow from '@/components/LibraryRow.jsx';
import LibraryActionsSheet from '@/components/LibraryActionsSheet.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import PullToRefresh from '@/components/PullToRefresh.jsx';
import { useLibraries } from '@/state/LibrariesContext.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';

// Index letters (IndexLetter.jsx) mark POSITION within one alphabetical stream and stay
// role="separator" — they are not structure, just a place a reader currently is. "Mine" and
// "Shared with me" are a different thing: the product's primary IA division (PRODUCT.md,
// ui-v3.md §2) between two real, labelled sections. Exposing that division only as a separator
// made it structurally unreachable to a screen reader navigating by heading — the shared
// section had no heading to land on at all. Promoted to <h2> so the outline says what the
// screen actually contains; the separator role stays reserved for the index letters it was
// built for.
const StreamHead = ({ label, count }) => (
  <h2 className="flex items-center justify-between border-b border-ink px-4 pb-1 pt-4 text-[11px] font-extrabold uppercase tracking-[0.16em]">
    <span>{label}</span>
    <span className="num tracking-normal text-ink-soft">{count}</span>
  </h2>
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
  const [actionsFor, setActionsFor] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <AppHeader
        wordmark
        right={
          // A tap, not a label, so it takes the 48px minimum like the search field.
          <Link
            to="/settings"
            aria-label={`Account — ${user?.email ?? 'signed in'}`}
            className="caps on-imprint flex min-h-12 min-w-12 items-center justify-center bg-imprint px-2 text-[11px] font-extrabold text-ink"
          >
            {user?.initials ?? '—'}
          </Link>
        }
      />

      <PullToRefresh onRefresh={refresh} className="min-h-0 flex-1">
        <main>
          {/* The app's home screen — and, per the critique this fixes, the one route whose
              heading outline was entirely empty. The header carries the wordmark, not this
              screen's name, so the <h1> is visually hidden rather than a second visible copy. */}
          <h1 className="sr-only">Libraries</h1>

          {error && (
            // Recovery is a control, not an instruction to perform a gesture.
            <div role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-ink">
              <p className="text-sm">{error}</p>
              <PlateButton variant="secondary" className="mt-4" onClick={refresh}>
                Try again
              </PlateButton>
            </div>
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
                // §6's empty state: a ruled frame with a caps invitation, at the same weight as
                // a full block. This was a 12px `--ink-soft` line under a rule — quieter than the
                // 22px/700 rows it stands in for, on the screen a cold open lands on — and it
                // pointed at the bar below rather than carrying its own control (§6: recovery is
                // a control, never an instruction to perform a gesture). The control duplicates
                // the bottom bar's primary rather than replacing it, reached a different way —
                // the same precedent LibraryBrowse's empty state sets for its own add action.
                <div className="m-4 border-2 border-ink p-8 text-center">
                  <p className="caps text-xs font-bold text-ink-soft">No libraries yet</p>
                  <PlateButton className="mt-4" onClick={() => navigate('/libraries/new')}>
                    New library
                  </PlateButton>
                </div>
              )}
              {owned.map((library) => (
                <LibraryRow key={library.id} library={library} onActions={setActionsFor} />
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
        </main>
      </PullToRefresh>

      <div className="pad-bottom-safe border-t-2 border-ink bg-paper p-4">
        <PlateButton onClick={() => navigate('/libraries/new')}>New library</PlateButton>
      </div>

      {actionsFor && (
        <LibraryActionsSheet
          library={actionsFor}
          open
          onClose={() => setActionsFor(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
};

export default Libraries;
