import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import SearchField from '@/components/imprint/SearchField.jsx';
import ItemRow from '@/components/ItemRow.jsx';
import SearchRowMarks from '@/components/SearchRowMarks.jsx';
import ItemActionsSheet from '@/components/ItemActionsSheet.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { itemsApi, searchApi } from '@/api';
import { useLibraries } from '@/state/LibrariesContext.jsx';
import useDebounced from '@/lib/useDebounced.js';
import { addRecent, clearRecents, readRecents } from '@/lib/recentSearches.js';

// Three, per ui-v3.md § Search. Below it the index would return most of the catalogue, which
// answers nothing and costs a round trip on the poor signal PRODUCT.md describes.
const MIN_CHARS = 3;

const Search = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { byId, canAct } = useLibraries();

  // Seeded from `?q=`, which the pinned field carries so the reader never types it twice — and
  // which makes this surface deep-linkable and refresh-safe, like every other real route here.
  const [terms, setTerms] = useState(() => params.get('q') ?? '');
  const settled = useDebounced(terms);
  const query = settled.trim();
  const isReady = query.length >= MIN_CHARS;

  // Bumped by `Try again`, which must re-run a query the reader has not changed — so the effect
  // below cannot key on the query alone.
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: 'idle', results: [], error: null });
  const [recents, setRecents] = useState(readRecents);
  const [actionsFor, setActionsFor] = useState(null);

  useEffect(() => {
    if (!isReady) {
      setState({ status: 'idle', results: [], error: null });
      return undefined;
    }
    let cancelled = false;
    setState((current) => ({ ...current, status: 'loading', error: null }));
    searchApi
      .query(query)
      .then((data) => {
        if (cancelled) return;
        const results = data?.results ?? [];
        setState({ status: 'done', results, error: null });
        // Only a query that found something is worth offering again: a recent that leads
        // nowhere is a shortcut to a dead end the reader has already walked.
        if (results.length > 0) setRecents(addRecent(query));
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', results: [], error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [query, isReady, attempt]);

  // A mutation patches the ONE row and never re-runs the query. This is not an optimisation:
  // the search index propagates asynchronously (~100ms, not guaranteed), so a re-run straight
  // after a lend can legitimately answer with a set that no longer holds the row just acted on,
  // and the reader would watch the item they just lent disappear. The single-item read is
  // authoritative and immediate; the index is neither.
  const patchResult = useCallback(async (item) => {
    try {
      const fresh = await itemsApi.get(item.libraryId, item.id);
      setState((current) => ({
        ...current,
        results: current.results.map((row) => (row.id === item.id ? { ...row, ...fresh } : row)),
      }));
    } catch {
      // The write succeeded — only the re-read failed. Leaving the row as it was is honest;
      // replacing it with an optimistic guess would state something nothing has confirmed.
    }
  }, []);

  const dropResult = useCallback((item) => {
    setState((current) => ({
      ...current,
      results: current.results.filter((row) => row.id !== item.id),
    }));
  }, []);

  const showRecents = state.status === 'idle' && recents.length > 0;

  return (
    <div className="min-h-dvh bg-paper">
      {/* No wordmark: that's reserved for the libraries root (DESIGN.md's header table). This
          screen is reached BY the pinned field, so its own header is just the way back — the
          same "onBack, no title" shape ItemDetail's own non-happy-path states already use.
          `onBack` is a real `history.back()`, not a hardcoded destination, so it returns the
          reader wherever they actually came from (the libraries root or an item's cover). The
          field itself moves into the body below rather than staying in the header: this surface
          IS the field, and a reader arriving mid-lookup must land on the thing they were
          typing into. */}
      <AppHeader onBack={() => navigate(-1)} search={false} />

      <main className="p-4">
        {/* The header carries no title here (just the back control), so the landmark needs its
            own accessible name — visually hidden, since the field below says what this screen
            is in the reader's eye line far louder than a heading would. */}
        <h1 className="sr-only">Search</h1>

        <SearchField value={terms} onQueryChange={setTerms} />

        {state.status === 'loading' && (
          <p role="status" className="caps mt-6 text-[11px] font-extrabold tracking-[0.16em] text-ink-soft">
            Searching
          </p>
        )}

        {state.status === 'error' && (
          // Inline and in place, with a control rather than an instruction to perform a
          // gesture (DESIGN.md §6). Never a toast: a toast carries confirmations only, and it
          // auto-dismisses, so a failure reported that way can be missed entirely.
          <div role="alert" className="mt-6 border-t-2 border-out bg-paper-deep p-4 text-ink">
            <p className="text-sm">{state.error}</p>
            <PlateButton
              variant="secondary"
              className="mt-4"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </PlateButton>
          </div>
        )}

        {state.status === 'done' && state.results.length === 0 && (
          // THE LIMITS PRINT HERE AND NOWHERE ELSE. A reader whose query matched is not owed an
          // explanation of what search covers — they have their answer, and the note would be
          // permanent chrome under every successful lookup. A reader who found nothing is owed
          // exactly this, because the difference between "you don't own it" and "search doesn't
          // look there" is the difference between trusting the catalogue and not.
          <div className="mt-6 border-2 border-ink p-8">
            <p className="caps text-xs font-extrabold tracking-[0.16em] text-ink-soft">
              Nothing matched
            </p>
            <p className="mt-4 text-sm text-ink">
              Search reads titles, authors, directors, cast and collections — not summaries, and
              not ISBNs.
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Accents count: one missing accent usually still finds a title, two do not.
            </p>
          </div>
        )}

        {state.status === 'done' && state.results.length > 0 && (
          <ul className="mt-6">
            {state.results.map((item) => {
              const library = byId(item.libraryId);
              // Positive knowledge only, exactly as LibraryBrowse gates its own actions: a
              // library this client cannot vouch for is treated as read-only. Absence of
              // knowledge is not permission, and search spans libraries this reader does not
              // own by definition.
              const isOwned = canAct(item.libraryId);
              return (
                <li key={item.id}>
                  <ItemRow
                    item={item}
                    libraryId={item.libraryId}
                    onActions={isOwned ? setActionsFor : undefined}
                    marks={
                      <SearchRowMarks
                        libraryName={library?.name ?? item.libraryName}
                        sharedFrom={library?.sharedFrom}
                      />
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}

        {showRecents && (
          <section className="mt-6">
            <div className="flex items-center justify-between gap-2 border-b-2 border-ink">
              <h2 className="caps text-[11px] font-extrabold tracking-[0.16em] text-ink-soft">
                Recent
              </h2>
              {/* No confirmation: nothing here is the reader's data, and running a search
                  rebuilds it. A confirmation step would be ceremony over a convenience. */}
              <button
                type="button"
                onClick={() => setRecents(clearRecents())}
                className="caps -mr-2 flex min-h-12 items-center px-2 text-[11px] font-extrabold tracking-[0.16em] text-ink underline"
              >
                Clear
              </button>
            </div>
            <ul>
              {recents.map((term) => (
                <li key={term}>
                  {/* A recent fills the field rather than navigating: the debounce then runs it
                      exactly as if the reader had typed it, and they can edit it in place
                      instead of starting over. Sentence case, in the sans — a recent is what
                      the reader typed, which is content (§3). */}
                  <button
                    type="button"
                    onClick={() => setTerms(term)}
                    className="flex min-h-12 w-full items-center border-b border-ink text-left text-[17px] font-semibold"
                  >
                    {term}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {actionsFor && (
        <ItemActionsSheet
          item={actionsFor}
          libraryId={actionsFor.libraryId}
          open
          onClose={() => setActionsFor(null)}
          onChanged={() => patchResult(actionsFor)}
          onDeleted={() => dropResult(actionsFor)}
        />
      )}
    </div>
  );
};

export default Search;
