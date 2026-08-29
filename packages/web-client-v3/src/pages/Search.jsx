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
import { addRecent, clearRecents, readRecents } from '@/lib/recentSearches.js';
import { replaceById } from '@/lib/replaceById.js';

// Three. Below it the index would return most of the catalogue, which
// answers nothing and costs a round trip on the poor signal PRODUCT.md describes.
const MIN_CHARS = 3;

const Search = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { byId, canAct } = useLibraries();

  // TWO VALUES, NOT ONE, and the split is the whole change. `terms` is what is in the field;
  // `query` is what was last SUBMITTED, and it lives in `?q=` rather than in state.
  //
  // The surface used to search as the reader typed, on a 300ms debounce. That fires a request per
  // pause rather than per intent — `roman` typed at an ordinary speed spends three round trips to
  // answer the one the reader meant — and PRODUCT.md's dominant scene is a bookshop on poor
  // signal, where those are the expensive kind. It was defensible only while the field had no
  // other way to act; it has two now, an action key on the phone keyboard and the magnifier
  // beside the text, both added for a reader who was already reaching for them.
  //
  // Deriving `query` from the URL rather than from a second piece of state is what keeps this
  // surface deep-linkable and refresh-safe: the address bar and the results cannot disagree,
  // because there is only one of them.
  const submitted = params.get('q') ?? '';
  const [terms, setTerms] = useState(submitted);
  const query = submitted.trim();
  const isReady = query.length >= MIN_CHARS;

  // Bumped by `Try again`, which must re-run a query the reader has not changed — so the effect
  // below cannot key on the query alone.
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: 'idle', results: [], error: null });
  const [recents, setRecents] = useState(readRecents);
  const [actionsFor, setActionsFor] = useState(null);

  // A SUBMIT THAT IS TOO SHORT MUST SAY SO. Under the debounce this state was invisible: nothing
  // had been asked, so nothing answering was not a failure. An explicit submit is a question, and
  // silence in reply to a question is the reader wondering whether search is broken.
  //
  // Set on the attempt rather than while typing, so a reader on their way to three characters is
  // not nagged at one and two. Cleared by any edit, because the next keystroke may resolve it.
  const [tooShort, setTooShort] = useState(false);

  // SUBMIT IS WHERE `?q=` IS WRITTEN, which is also where the search runs — one act, one record.
  // It used to be written as the debounced value settled, for a reason that still holds and is
  // now served for free: without it the URL froze at whatever the reader arrived with, so
  // refining `roman` to `nadja`, tapping a result and pressing Back gave them a normal-looking
  // results screen that was not theirs.
  //
  // `replace`, so a refinement does not push a history entry — Back must leave the surface, not
  // walk the reader backwards through their own attempts.
  //
  // `attempt` is bumped on EVERY submit, not only on a changed query, so re-submitting the same
  // text is a retry rather than a no-op. `setParams` with an unchanged value produces no state
  // change and would otherwise leave the action key dead on the one screen where pressing it
  // again is exactly what a reader does when an answer looked wrong.
  const onSubmit = useCallback(
    (text) => {
      const next = text.trim();
      if (next.length < MIN_CHARS) {
        setTooShort(true);
        return;
      }
      setTooShort(false);
      setAttempt((n) => n + 1);
      if (params.get('q') !== next) setParams({ q: next }, { replace: true });
    },
    [params, setParams],
  );

  // Typing changes the field and nothing else — no request, no URL write. The previous results
  // stay exactly as they are until the reader asks again.
  //
  // EMPTYING IT IS THE EXCEPTION, and it is not typing. THE REASON IS THE RECENTS: `showRecents`
  // and `showEmptyInvitation` both require `status === 'idle'`, so if results survived an empty
  // field the reader could never get back to their recent searches without leaving the screen —
  // one search would cost them the shortcut list for the rest of the visit.
  //
  // Two lesser arguments agree: eight rows under an empty field state that they are results for
  // nothing, and this is what the surface already did — under the debounce the query WAS the
  // field text, so clearing it emptied the query and the effect's `!isReady` branch wiped the
  // results. Deriving the query from `?q=` would have silently dropped that, so this line keeps
  // a behaviour rather than inventing one.
  //
  // It does NOT rest on the mark's name. That argument was available — the label read `Clear the
  // search` — and it was the weakest of the three, which is why the mark could be renamed to
  // `Clear the text` without touching what it does. Deleting the last character by hand is the
  // same act and takes the same branch.
  const onQueryChange = useCallback(
    (text) => {
      setTerms(text);
      setTooShort(false);
      if (text === '' && params.get('q')) setParams({}, { replace: true });
    },
    [params, setParams],
  );

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
        // REPLACED, never merged, and this is the whole defect: `{ ...row, ...fresh }` cannot
        // DELETE a key. `lentTo` is `omitempty`, so a returned item comes back with the key
        // absent rather than null — and the stale `lentTo` survived the spread. Measured: both
        // requests succeeded, the loan was genuinely over, and the row still printed OUT while
        // the sheet still offered `Mark returned`. Tapping it again wrote a THIRD `RETURNED`
        // event for one loan, into the append-only ledger this product is positioned on, which
        // `loans.js` then mis-pairs for ever.
        //
        // Worst by reportability: the write succeeded and only the display lied, so there is
        // nothing for the reader to report — and their natural response is what does the damage.
        //
        // The merge was guarding nothing. `GET /libraries/{id}/items/{itemId}` returns
        // `LibraryId` and `LibraryName` (handlers/items.go:577-578), which are the only fields a
        // search row needs beyond the listing shape. Same construction as
        // `StreamContext.patchItem`, which has always replaced.
        results: replaceById(current.results, fresh),
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

  // THE PREVIOUS SET STAYS ON SCREEN WHILE THE NEXT ONE IS IN FLIGHT. Gating the list on
  // `status === 'done'` unmounted every row on each refinement: measured, eight rows collapsed
  // `<main>` to 135px, and four hundred took `scrollHeight` from 42,464 to 844 and `scrollY` from
  // 4,180 to zero. A reader refining a query lost their place on every keystroke past the third.
  //
  // It also falsified the premise of the mount measurement I ran: I ruled windowing out because
  // ~110ms is "one commit the reader is already waiting through", and it is in fact one commit
  // PER SETTLED QUERY, each followed by a scroll to zero. The refusal of windowing stands —
  // scrolling is genuinely free, measured at p95 10.3ms with no frames over budget — but I should
  // have measured a refinement rather than a cold search. Keeping the rows mounted is the fix;
  // windowing never was.
  //
  // Cleared only when the new set lands, so `loading` shows the OLD answer under a `SEARCHING`
  // mark rather than a blank page. An error keeps them too: a failed refinement should not
  // destroy the results the reader already had.
  const visibleResults = state.status === 'idle' ? [] : state.results;

  // Every state says what it is, in one place, for the one reader who cannot see any of it.
  // Written as a value rather than inline so the region's text is a single expression with no
  // state that can silently produce an empty string.
  const announcement = (() => {
    // FIRST, because it is the answer to the most recent act. A reader who submits two characters
    // gets no request and therefore no change of `state` at all — the region would go on
    // announcing whatever the previous query returned, which for the reader who cannot see the
    // line above reads as "your search ran and this is the result".
    if (tooShort) return `Search needs at least ${MIN_CHARS} characters.`;
    if (state.status === 'loading') return 'Searching';
    if (state.status === 'error') return `Search failed. ${state.error}`;
    if (state.status !== 'done') return '';
    // THE OUTCOME, not the whole block. Repeating the scope sentence here would make a
    // browse-mode reader meet it twice — once announced, once again as visible text they navigate
    // to — and that text is not hidden from anyone; it was never announced, which is a different
    // problem. "Nothing matched" is the fact that was missing, and it is what sends a reader to
    // the detail rather than leaving them with silence.
    // OUTCOME PLUS A POINTER, not the paragraph. Repeating the scope sentence would make a
    // browse-mode reader meet it twice, once announced and once as text they navigate to — but a
    // `role="status"` fires WITHOUT moving the reading cursor, so announcing the head alone leaves
    // the reader where they were typing with no sign that an explanation exists a few nodes away.
    // A sighted reader takes the head and the reason in one visual field; the pointer is what
    // makes those two readers equal. One clause is the difference between "there is nothing here"
    // and "there is nothing here, and here is where the reason is".
    if (state.results.length === 0) return 'Nothing matched. What search covers is explained below.';
    return `${state.results.length} ${state.results.length === 1 ? 'result' : 'results'}`;
  })();

  const showRecents = state.status === 'idle' && recents.length > 0;
  // A first visit has no recents and no query, so the surface below the field was BLANK — and
  // The Empty state's rule is "a ruled frame with a caps invitation, at the same weight as a full
  // block", never nothing at all. It is also the one state where the reader may not know what
  // It does NOT restate what search covers. That is ruling 3 — the limits print at zero results
  // and nowhere else — and the first draft of this block broke it, caught by the probe that
  // asserts the scope sentence is absent whenever there is no failed lookup to explain. An
  // invitation says what to do; the limits explain a result the reader did not expect.
  const showEmptyInvitation = state.status === 'idle' && recents.length === 0;

  return (
    <div className="flex h-dvh flex-col bg-paper">
      {/* No wordmark: that's reserved for the libraries root (the header table). This screen
          takes its own name instead, like every other built screen — it shipped as back-and-
          nothing, which is the transitional STUB shape, and a finished screen wearing it is
          announcing it has nothing to call itself. The two titleless headers left in the app
          are titleless for reasons this screen does not have: ItemDetail's cover puts the name
          in the hero, and RouteFallback does not know which route it stands in for.
          NO `onTitleTap`, deliberately. LibraryBrowse's title scrolls its stream to the top
          because that stream is alphabetical and the top is a PLACE; a result set arrives in an
          order `POST /search` does not define, and the sticky field below already keeps the one
          control that can refine a query permanently in reach.
          `onBack` is a real `history.back()`, not a hardcoded destination, so it returns the
          reader wherever they actually came from (the libraries root or an item's cover). The
          field itself moves into the body below rather than staying in the header: this surface
          IS the field, and a reader arriving mid-lookup must land on the thing they were
          typing into. */}
      <AppHeader title="Search" onBack={() => navigate(-1)} search={false} />

      <main
        data-scroll-region
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {/* Visually hidden because the header carries the name — the same construction as every
            other titled screen, where the landmark's accessible name and the printed title are
            the same words rendered once each for the two audiences. */}
        <h1 className="sr-only">Search</h1>

        {/* STICKY, because at four hundred results the surface is 42,464px tall and the field
            scrolled away with everything else — refining a query meant scrolling back roughly
            4,000px to reach the only control that can refine it. The measurement I ran asked
            whether the list stutters and never asked whether the reader can get anywhere; it is
            fast and, until this, unnavigable.
            `-mx-4 px-4` so the ground spans the full column rather than letting rows show through
            beside it, and its own 2px rule so it reads as a surface the content passes under
            rather than as a block that happens to be stuck. `top-0` is the top of the SCROLL
            REGION, not of the viewport: this screen took the app shell's fixed-height shape, so
            `<main>` is the scrollport and the header sits above it as a fixed flex item. The
            field therefore comes to rest directly under the header with no offset to compute —
            the same reason `IndexLetter`'s own `top-0` has always landed under LibraryBrowse's
            header. Under the document scrolling this screen used to do, `top-0` was the viewport
            edge and a pinned header would have hidden the field behind it.
            `pb-2` (not the `pb-3` this shipped with, one and a half divisions and off the scale):
            shot at 8px, 12px and 16px against the same fixture results, 12px and 16px both open a
            strip of paper between the field's own black border and this rule, so the rule reads as
            a divider floating below the field rather than the field's own base — the opposite of
            "a surface the content passes under" two lines up. 8px closes that gap enough that the
            rule reads as closing the field's frame, not as a break after it, which also matches
            `AppHeader`'s identical construction (search field, then this same gap, then its own
            closing `border-b-2`) so the root and this screen read as one system rather than two
            locally-plausible ones. */}
        {/* `pt-4` HERE and not on the scrollport, measured: a sticky element cannot rise above its
            containing block's content box, so `<main>`'s own `p-4` clamped this block 16px below
            the header and left a strip of bare paper for rows to slide through — exactly the
            "surface the content passes under" this construction exists to be. Carried on the block
            instead, the same 16px is part of the opaque stuck surface: identical at rest, correct
            once stuck. */}
        <div className="sticky top-0 z-10 -mx-4 border-b-2 border-ink bg-paper px-4 pb-2 pt-4">
          <SearchField value={terms} onQueryChange={onQueryChange} onSubmit={onSubmit} />
          {/* Inside the sticky block, so it travels with the field it is about — a reason that
              scrolls away from its cause explains nothing. Not the Error construction (the
              state grammar's `--paper-deep` and `--out` top rule): nothing failed, and dressing a rule the reader
              simply has not met yet as a failure is the same misreport as the no-input notice on
              the capture screens. It takes `Field`'s hint treatment instead, which is this
              system's existing line-under-a-field.
              THE FIGURE IS SANS, and the guard is why this comment exists. I set it in the mono
              on the reflex that a numeral takes the mono, and `monoFieldCoverage` went red — the
              mono rule splits on what the numeral IS, not on whether it is a digit: mono is for a labelled
              datum, sans for a numeral inside a sentence the app authored. This is a sentence,
              the same case as "Delete Fiction and its 412 items?". */}
          {tooShort && (
            <p className="mt-1 text-[13px] text-ink-soft">
              Search needs at least {MIN_CHARS} characters.
            </p>
          )}
        </div>

        {/* ONE PERSISTENT role="status", carrying the outcome for EVERY state.
            At rest with eight results the surface announced nothing at all: the only live region
            was the empty toast container, and "Searching" existed during load and then left the
            DOM. So a non-sighted reader heard "Searching" and then permanent silence, and could
            not tell eight results from nothing matched — the block that exists specifically to
            prevent "I don't own it" was the one thing never spoken.
            It must not be conditionally rendered. A live region announces CHANGES to itself, so a
            region that unmounts takes its own announcement with it; this one is always in the DOM
            and only its text changes. `aria-live="polite"` is implicit in role=status, and polite
            is right — a result set is not an interruption. */}
        <p role="status" className="sr-only">
          {announcement}
        </p>

        {/* The mark, not the list's absence. Rendering it as a caps line ABOVE the previous
            results is what lets those results stay mounted — see `visibleResults`. */}
        {state.status === 'loading' && (
          <p className="caps mt-6 text-[11px] font-extrabold tracking-[0.16em] text-ink-soft">
            Searching
          </p>
        )}

        {state.status === 'error' && (
          // Inline and in place, with a control rather than an instruction to perform a
          // gesture. Never a toast: a toast carries confirmations only, and it
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

        {showEmptyInvitation && (
          <div className="mt-6 border-2 border-ink p-8">
            <p className="caps text-xs font-extrabold tracking-[0.16em] text-ink-soft">
              Search every library
            </p>
            <p className="mt-4 text-sm text-ink">
              Type three characters or more to look across every library you can see.
            </p>
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

        {visibleResults.length > 0 && (
          <ul className="mt-6">
            {visibleResults.map((item) => {
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
                      the reader typed, which is content. */}
                  <button
                    type="button"
                    // FILLS AND RUNS. Under the debounce, filling the field was enough — the
                    // query fired on its own a moment later. Now nothing runs without a submit,
                    // so a recent that only filled the box would leave the reader looking at
                    // their old results with the new term sitting above them, having to press
                    // again a shortcut they tapped to avoid pressing.
                    onClick={() => {
                      setTerms(term);
                      onSubmit(term);
                    }}
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
