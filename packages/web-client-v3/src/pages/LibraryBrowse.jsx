import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import IndexLetter from '@/components/imprint/IndexLetter.jsx';
import CollectionBoard from '@/components/imprint/CollectionBoard.jsx';
import ItemRow from '@/components/ItemRow.jsx';
import PullToRefresh from '@/components/PullToRefresh.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import AddItemSheet from '@/components/AddItemSheet.jsx';
import ItemActionsSheet from '@/components/ItemActionsSheet.jsx';
import CollectionActionsSheet from '@/components/CollectionActionsSheet.jsx';
import SharedRibbon from '@/components/imprint/SharedRibbon.jsx';
import { Plus } from '@/components/icons';
import { useLibraries } from '@/state/LibrariesContext.jsx';
import { useStream } from '@/state/StreamContext.jsx';

const COLLECTION = 2;

const SkeletonRow = () => (
  <div className="flex gap-4 border-b border-ink p-4" aria-hidden="true">
    <span className="h-[72px] w-12 border-2 border-ink bg-paper-deep" />
    <span className="flex-1">
      <span className="block h-3 w-12 bg-paper-deep" />
      <span className="mt-2 block h-4 w-1/2 bg-paper-deep" />
      <span className="mt-2 block h-3 w-1/3 bg-paper-deep" />
    </span>
  </div>
);

const LibraryBrowse = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const { byId, canAct, error: librariesError, refresh: refreshLibraries } = useLibraries();
  const library = byId(libraryId);
  // Gate on POSITIVE knowledge that this library is the reader's own. Deriving read-only from
  // `library?.sharedFrom` made "not loaded yet" and "fetch failed" indistinguishable from
  // "mine" — so a cold deep link, a PWA restart, or any GET /libraries failure rendered the add
  // plate and row actions on a shared library, permanently if the fetch never recovered.
  // Read-only is the safe default, and absence of knowledge is not permission.
  const canModify = canAct(libraryId);
  const isReadOnly = !canModify;
  const provenanceKnown = Boolean(library?.sharedFrom);
  const { runs, isLoading, isAppending, isComplete, error, loadMore, refresh, patchItem, dropItem } =
    useStream(libraryId);
  const [isAdding, setIsAdding] = useState(false);
  const [actionsFor, setActionsFor] = useState(null);
  const [boardActionsFor, setBoardActionsFor] = useState(null);
  const sentinel = useRef(null);
  const scroller = useRef(null);

  // Pagination stays invisible: the reader's sense of position comes from the index letters,
  // not from page boundaries.
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((r) => r.isIntersecting)) loadMore();
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <AppHeader
        title={library?.name ?? ''}
        onBack={() => navigate('/libraries')}
        search={false}
        onTitleTap={() => scroller.current?.scrollTo({ top: 0 })}
        right={
          // Read-only means the action is absent, not disabled.
          !canModify ? null : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              aria-label="Add an item"
              className="on-imprint flex size-12 items-center justify-center bg-imprint text-ink"
            >
              <Plus />
            </button>
          )
        }
      />

      {/* Read-only because ownership could not be established, rather than because the library
          is shared. Saying so matters: without it a reader whose connection dropped sees a
          library that has silently lost its add button and every row action, with nothing to
          explain it and nothing to retry. */}
      {librariesError && !library && (
        <div role="alert" className="border-b-2 border-t-2 border-out bg-paper-deep p-4 text-ink">
          <p className="text-sm">
            Could not check whether this library is yours, so it is showing read-only.
          </p>
          <PlateButton variant="secondary" className="mt-4" onClick={refreshLibraries}>
            Try again
          </PlateButton>
        </div>
      )}

      {provenanceKnown && (
        // Provenance is declared once, here, and never repeated on every row. Routed through
        // the same SharedRibbon vocabulary component LibraryRow and DetailMarks use — the
        // hand-rolled version this replaced set the owner's email address in `.num` (Chivo
        // Mono), which DESIGN.md §3 reserves for numerals, not an authored address.
        <p className="relative border-b-2 border-ink px-4 py-2">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-shared" />
          <span className="caps text-[11px] font-bold tracking-[0.16em]">
            <SharedRibbon direction="in" owner={library.sharedFrom} />
          </span>
        </p>
      )}

      <PullToRefresh onRefresh={refresh} className="min-h-0 flex-1" ref={scroller}>
        <main>
          <h1 className="sr-only">{library?.name ?? 'Library'}</h1>

          {error && (
            // Recovery is a CONTROL, never an instruction to perform a gesture: "pull down to
            // try again" tells a keyboard or mouse reader to do something they cannot do, on
            // the one screen state whose whole purpose is recovery. The gesture remains as the
            // touch shortcut for the same action rather than being its only route.
            <div role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-ink">
              <p className="text-sm">{error}</p>
              <PlateButton variant="secondary" className="mt-4" onClick={refresh}>
                Try again
              </PlateButton>
            </div>
          )}

          {isLoading && !error && (
            <div aria-busy="true">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          )}

          {!isLoading && !error && runs.length === 0 && (
            <div className="m-4 border-2 border-ink p-8 text-center">
              <p className="caps text-xs font-bold text-ink-soft">Nothing filed here yet</p>
              {!isReadOnly && (
                <p className="mt-2 text-sm">Add the first volume with the plus above.</p>
              )}
            </div>
          )}

          {runs.map((run) => (
            <section key={run.key}>
              {/* A closed run knows its final count; the tail run does not, so it shows none. */}
              <IndexLetter letter={run.letter} count={run.closed ? run.itemCount : null} />
              {run.entries.map((entry) =>
                entry.type === COLLECTION ? (
                  <CollectionBoard
                    key={entry.id}
                    board={entry}
                    libraryId={libraryId}
                    onItemActions={isReadOnly ? undefined : setActionsFor}
                    onBoardActions={isReadOnly ? undefined : setBoardActionsFor}
                  />
                ) : (
                  <ItemRow
                    key={entry.id}
                    item={entry}
                    libraryId={libraryId}
                    onActions={isReadOnly ? undefined : setActionsFor}
                  />
                ),
              )}
            </section>
          ))}

          <div ref={sentinel} aria-hidden="true" className="h-px" />

          {isAppending && (
            <p role="status" className="caps p-4 text-center text-[11px] font-bold text-ink-soft">
              Loading more
            </p>
          )}
          {isComplete && runs.length > 0 && (
            <p className="caps border-t-2 border-ink p-4 text-center text-[11px] font-bold text-ink-soft">
              End of the shelf
            </p>
          )}
        </main>
      </PullToRefresh>

      <AddItemSheet open={isAdding} onClose={() => setIsAdding(false)} libraryId={libraryId} />

      {boardActionsFor && (
        <CollectionActionsSheet
          board={boardActionsFor}
          libraryId={libraryId}
          open
          onClose={() => setBoardActionsFor(null)}
          // Deleting a collection genuinely restructures the stream — its members become
          // standalone entries and re-file alphabetically — so this one does reload, and
          // restores the scroll position afterwards.
          onChanged={async () => {
            const top = scroller.current?.scrollTop ?? 0;
            await refresh();
            requestAnimationFrame(() => scroller.current?.scrollTo({ top }));
          }}
        />
      )}

      {actionsFor && (
        <ItemActionsSheet
          item={actionsFor}
          libraryId={libraryId}
          open
          onClose={() => setActionsFor(null)}
          // Patch the one item rather than reloading: a lend or return must not cost the
          // reader their place in a thousand-item stream.
          onChanged={() => patchItem(actionsFor.id)}
          onDeleted={() => dropItem(actionsFor.id)}
        />
      )}
    </div>
  );
};

export default LibraryBrowse;
