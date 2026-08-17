import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import VolumeFrame from '@/components/imprint/VolumeFrame.jsx';
import DetailMarks from '@/components/imprint/DetailMarks.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import LedgerRow from '@/components/imprint/LedgerRow.jsx';
import LendSheet from '@/components/LendSheet.jsx';
import { Search } from '@/components/icons';
import { eventsApi, itemsApi } from '@/api';
import { detailLineParts } from '@/lib/format';
import { pairLoanEvents } from '@/lib/loans';
import { useLibraries } from '@/state/LibrariesContext.jsx';
import { useToast } from '@/state/ToastContext.jsx';

const FILM = 1;
const LEDGER_PREVIEW = 3;

// Names take the sans and only a figure takes the mono (§3) — the same split PlateLine already
// makes on the row, carried onto detail's longer line. The library is deliberately absent here:
// the Plate Line is the WORK (author, edition), and where a COPY is kept belongs to the Detail
// Marks column beside the hero instead (DESIGN.md §5, "Plate Line ... it never carries the
// library"). Running them together as `AUTHOR · ISBN · LIBRARY` put three categories in one
// dot-separated run and made location read as identity.
const buildDetailLineSegments = (item) => {
  const { names, identifiers } = detailLineParts(item);
  return [
    names && { text: names, mono: false },
    ...identifiers.map((value) => ({ text: value, mono: true })),
  ].filter(Boolean);
};

// PUT replaces the whole record (ItemForm's own buildPayload does the same, from form state), so
// this must resend every field already on the loaded item — not just `updatePicture` — or a
// partial body would silently drop its authors/summary/etc. Sourced from the fetched item rather
// than a form, since this screen has none: "Fetch cover" repairs a cover that is CORRECT but did
// not arrive (the async pipeline failing, exactly the case `data fix-thumbnails` exists for), not
// a wrong address, so `pictureUrl` itself is resent unchanged and only `updatePicture` is new.
const buildFetchCoverPayload = (item) => {
  const shared = {
    title: item.title,
    summary: item.summary ?? '',
    pictureUrl: item.pictureUrl ?? null,
    collectionId: item.collectionId ?? null,
    order: item.collectionId ? item.order ?? null : null,
    updatePicture: true,
  };
  return item.type === FILM
    ? {
        ...shared,
        directors: item.directors ?? [],
        cast: item.cast ?? [],
        releaseYear: item.releaseYear ?? null,
        duration: item.duration ?? null,
        tmdbId: item.tmdbId ?? null,
      }
    : {
        ...shared,
        authors: item.authors ?? [],
        isbn: item.isbn ?? '',
      };
};

const DetailLine = ({ item }) => {
  const segments = buildDetailLineSegments(item);
  if (segments.length === 0) return null;
  return (
    <p className="text-xs text-cover-soft">
      {segments.map((segment, index) => (
        <span key={`${segment.mono}-${segment.text}`}>
          {index > 0 && ' · '}
          <span className={segment.mono ? 'num' : undefined}>{segment.text}</span>
        </span>
      ))}
    </p>
  );
};

// The one surface that inverts to the black cover: here the reader is looking at a single
// thing rather than scanning a thousand, so the cover earns its impact.
const ItemDetail = () => {
  const { libraryId, itemId } = useParams();
  const navigate = useNavigate();
  const { canAct, byId, error: librariesError, refresh: refreshLibraries } = useLibraries();
  // Absence of knowledge is not permission: until the library is confirmed as owned, actions
  // stay absent rather than briefly appearing before a slow /libraries fetch resolves.
  const isReadOnly = !canAct(libraryId);
  // The Detail Marks column needs the library's own sharedTo/sharedFrom, which live on the
  // LIBRARY, not the item (§6 in the brief) — /libraries is already loaded by the provider, so
  // this is a lookup, not a second fetch.
  const library = byId(libraryId);

  const [item, setItem] = useState(null);
  const [loans, setLoans] = useState([]);
  const [status, setStatus] = useState('loading');
  // Lend genuinely needs input (a borrower's name), so it is the one action that still opens a
  // sheet — and that sheet holds ONLY the lend form, never a menu.
  const [isLending, setIsLending] = useState(false);
  // "Mark returned" needs no input, so it acts directly with no sheet at all — the defect was
  // never "a sheet", it was a label promising one action and delivering a menu of three.
  const [isReturning, setIsReturning] = useState(false);
  // Surfaced from VolumeFrame's own `failed` state (see the comment there) — not derived from
  // `item.pictureUrl` alone, which was the original defect's shape wearing a new location: a
  // present URL says nothing about whether the thumbnail it produced actually loaded.
  const [coverFailed, setCoverFailed] = useState(false);
  const [isFetchingCover, setIsFetchingCover] = useState(false);
  // Delete is destructive and confirms in place — the same in-page reveal UnshareLibrary already
  // uses, rather than a sheet. It no longer sits apart at the foot: see the comment beside the
  // action row below for why that placement was reversed.
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Inline, because a toast is never the only report of a failure (DESIGN.md, "Errors").
  const [actionError, setActionError] = useState(null);
  const { confirm } = useToast();
  // Where focus lands the instant the confirmation is revealed, and where it returns on cancel.
  // See the effect below for why these are refs rather than `document.activeElement`.
  const keepItRef = useRef(null);
  const deleteTriggerRef = useRef(null);

  // Deliberately does NOT flip `status` to 'loading' itself — that is left to the effect below,
  // which owns the initial/route-driven fetch. `onChanged` calls this directly after a lend or
  // return, and re-reading quietly (content stays on screen) is the point: a mutation returns an
  // empty body, so the item must be re-read, but the reader should not see the whole cover blank
  // out just to confirm what they already just did.
  // `isCancelled` defaults to "never" for the manual re-reads after a mutation (markReturned,
  // LendSheet's onLent): those happen for whichever item is currently on screen, so there is
  // nothing to guard against. The mount effect below is the one caller that passes a real
  // guard, because it is the one call React Router can outlive: it keeps this same element
  // mounted across a `:itemId` change, so a slow fetch for the item that just left the URL can
  // resolve after a fast one for the item that replaced it — painting item A's content (and,
  // worse, letting a stray markReturned post A's borrower against B's id) at item B's URL.
  const load = useCallback(
    async (isCancelled = () => false) => {
      try {
        const [fetchedItem, events] = await Promise.all([
          itemsApi.get(libraryId, itemId),
          eventsApi.list(libraryId, itemId, { limit: 20 }).catch(() => ({ events: [] })),
        ]);
        if (isCancelled()) return;
        setItem(fetchedItem);
        setLoans(pairLoanEvents(events?.events ?? []));
        setStatus('ready');
      } catch (err) {
        if (isCancelled()) return;
        setStatus(err.status === 404 ? 'missing' : 'error');
      }
    },
    [libraryId, itemId],
  );

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Acts directly: "Mark returned" needs no input, so a label promising that action performs it
  // rather than opening a menu of unrelated choices (the bug this replaces).
  const markReturned = async () => {
    if (!item) return;
    setActionError(null);
    setIsReturning(true);
    try {
      await eventsApi.create(libraryId, itemId, { type: 'RETURNED', event: item.lentTo });
      // The write returns an empty body, so the item is re-read rather than assumed.
      await load();
      confirm(`${item.title} is back`);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsReturning(false);
    }
  };

  // Repairs a cover that is correct but never arrived — the async thumbnail pipeline failing,
  // which is what `data fix-thumbnails` exists for on the admin side. Not a form field: the
  // address itself is not wrong, so there is nothing here for the reader to retype.
  const fetchCover = async () => {
    if (!item) return;
    setActionError(null);
    setIsFetchingCover(true);
    try {
      const update = item.type === FILM ? itemsApi.updateVideo : itemsApi.updateBook;
      await update(libraryId, itemId, buildFetchCoverPayload(item));
      // The write returns an empty body, so the item is re-read rather than assumed — the same
      // pattern markReturned and deleteItem already follow.
      await load();
      // `coverFailed` is a snapshot from VolumeFrame's LAST load attempt, against the OLD src —
      // the request above just changed `updatedAt`, so the cache-busted src is new and nothing
      // has tried loading it yet. Waiting on VolumeFrame's own independent 4s retry clock to
      // clear it would leave this button asserting "still broken" for up to four seconds after
      // a request that may have already worked, which is a control stating something the screen
      // cannot support — the same shape as the checkbox this control replaced. Clearing it here
      // removes that stale assertion, not a true one: if the new src also fails, VolumeFrame's
      // own onError fires again and calls onFailedChange(true) right back.
      setCoverFailed(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsFetchingCover(false);
    }
  };

  // Sheet.jsx's own mechanism reads `document.activeElement` to remember its opener, which works
  // there because a Sheet is an overlay: the trigger stays mounted underneath it. This
  // confirmation is not an overlay — the ternary below REPLACES the Delete trigger with the
  // confirmation block in the same commit, so the trigger is already gone from the document by
  // the time any effect could read `document.activeElement`. Reading it here would just capture
  // whatever the browser defaults an unmounted-focus to (measured: `<body>`) — which is exactly
  // the defect this replaces, not a fix for it. So this holds a ref to each control instead:
  // `keepItRef` for the safe default the reader lands on, `deleteTriggerRef` for the Delete
  // button a fresh copy of which remounts the instant they cancel. React attaches refs and
  // commits the DOM change in the same phase, before this effect's cleanup runs, so
  // `deleteTriggerRef.current` is already the NEW node by the time cancel calls `.focus()` on it.
  //
  // Focus goes to "Keep it" on reveal, never "Delete for good" — the safe default for the single
  // most destructive control in the app, which also takes the lending history with it.
  useEffect(() => {
    if (isConfirmingDelete) keepItRef.current?.focus();
    return () => {
      if (isConfirmingDelete) deleteTriggerRef.current?.focus();
    };
  }, [isConfirmingDelete]);

  const deleteItem = async () => {
    if (!item) return;
    setActionError(null);
    setIsDeleting(true);
    try {
      await itemsApi.remove(libraryId, itemId);
      confirm(`${item.title} deleted`);
      // Nothing is left to re-read: the item is gone, so return to the library it came from.
      navigate(`/libraries/${libraryId}`);
    } catch (err) {
      // Stays confirming: the reader already committed to deleting, and dropping back to the
      // single "Delete" button would make them confirm twice for one failed attempt.
      setActionError(err.message);
      setIsDeleting(false);
    }
  };

  if (status === 'missing' || status === 'error') {
    return (
      <div className="min-h-dvh bg-ink text-paper">
        <AppHeader inverted onBack={() => navigate(-1)} search={false} />
        <main className="p-4">
          {/* The header carries no title on this screen (DESIGN.md §3 table), so this state
              still needs a real accessible name — visually hidden, since the alert already
              says what happened in the reader's eye line. */}
          <h1 className="sr-only">Item detail</h1>
          <p role="alert" className="border-2 border-out p-4 text-sm">
            {status === 'missing'
              ? 'That volume is not in this collection. It may have been deleted, or the link may be wrong.'
              : 'Could not load this volume. Check your connection and try again.'}
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-ink text-paper">
      <AppHeader
        inverted
        search={false}
        onBack={() => navigate(-1)}
        right={
          <Link
            to="/search"
            aria-label="Search every library"
            className="on-imprint flex size-12 items-center justify-center bg-imprint text-ink"
          >
            <Search />
          </Link>
        }
      />

      {status === 'loading' && (
        // `px-4 py-6` — the SAME padding as the ready branch below, not `p-6`: the two used to
        // differ, so the instant content landed every element nudged by the difference, which
        // is the exact thing a "ruled skeleton at the correct ratio" (DESIGN.md §6) exists to
        // prevent. The hero frame and the three action controls are RULED, unfilled boxes —
        // the same treatment VolumeFrame's own empty frame now takes (round 5, item 1) — rather
        // than a tinted fill, since a filled box in exactly the hero's own size/position would
        // read as "artwork is here" before any fetch has even returned. The plain bars standing
        // in for lines of text (title, plate line, summary) are a different affordance — a
        // skeleton LINE, not an artwork frame — and keep a quiet `bg-cover-rule/25` tint so they
        // are visible at all; the same token `OverprintStamp`'s row variant already tunes with
        // opacity, not a new one.
        <main className="px-4 py-6" aria-busy="true">
          <h1 className="sr-only">Item detail</h1>
          <div aria-hidden="true">
            <div className="mb-6 flex items-start gap-4">
              <span className="block h-[198px] w-[132px] border-2 border-paper" />
              <span className="flex-1 pl-2">
                <span className="block h-4 w-24 bg-cover-rule/25" />
                <span className="mt-3 block h-5 w-20 bg-cover-rule/25" />
              </span>
            </div>
            <span className="block h-8 w-3/4 bg-cover-rule/25" />
            <span className="mt-2 block h-3 w-1/2 bg-cover-rule/25" />
            <div className="my-4 h-1 bg-imprint" />
            <span className="block h-3 w-full bg-cover-rule/25" />
            <span className="mt-2 block h-3 w-5/6 bg-cover-rule/25" />
            <span className="mt-2 block h-3 w-2/3 bg-cover-rule/25" />
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="block h-12 w-24 border-2 border-paper" />
              <span className="block h-12 w-20 border-2 border-paper" />
              <span className="block h-12 w-24 border-2 border-paper" />
            </div>
          </div>
        </main>
      )}

      {status === 'ready' && item && (
        <main className="px-4 py-6">
          {/* Detail is the one screen where artwork earns real space: the reader is looking
              at a single object, not scanning a thousand. Same 2:3 frame as the stream — book
              and film are identical, type is not marked (DESIGN.md §4) — at hero scale, ruled
              in paper on the cover. VolumeFrame already draws
              the collection-order plate inside itself — a second plate beside it would label
              the same fact twice. Beside it, Detail Marks fills what was dead space with
              everything true of the COPY rather than the work: filed, visible, circulating. */}
          <div className="mb-6 flex items-start gap-4">
            {/* `relative shrink-0` here, not on VolumeFrame itself: the wrapper is what lets
                "Fetch cover" sit ON the frame without VolumeFrame knowing anything about the
                action — it stays a pure presentational component, only reporting `failed` up.
                `shrink-0` moved from VolumeFrame's own root to this wrapper, since the wrapper
                is the flex child now (beside DetailMarks' `flex-1`) and the one that must not
                shrink. */}
            <div className="relative shrink-0">
              <VolumeFrame item={item} hero onFailedChange={setCoverFailed} />
              {/* Gated on the REAL failure, not on `pictureUrl` merely existing — the fix for
                  the defect this replaces. Detection often returns no cover at all, which
                  `pictureUrl` being present would have excluded from getting help; here the
                  reverse case is the one this control repairs, so it stays absent whenever
                  there is genuinely nothing to fetch, and absent for read-only viewers just
                  like Lend/Edit/Delete below. The frame's own rule stays the only "fill": no
                  background here, and `inset-x-2 inset-y-4` (division-scale insets, not the
                  arbitrary `inset-0`) keeps the button's own border a visible few px clear of
                  the frame's — two ruled rectangles, not one control fused to the other. */}
              {!isReadOnly && coverFailed && item.pictureUrl && (
                <div className="absolute inset-x-2 inset-y-4 flex items-center justify-center">
                  <PlateButton variant="secondary" disabled={isFetchingCover} onClick={fetchCover}>
                    {isFetchingCover ? 'Fetching' : 'Fetch cover'}
                  </PlateButton>
                </div>
              )}
            </div>
            <DetailMarks item={item} library={library} loans={loans} />
          </div>

          {/* The visible title doubles as the screen's <h1>; nothing hides it, and content
              titles are never uppercased (§3). */}
          <h1 className="text-[32px] font-extrabold leading-[1.06]">{item.title}</h1>

          {/* Never carries the library (DESIGN.md §5) — that fact moved into Detail Marks
              above, beside the hero, where location joins visibility and circulation. */}
          <DetailLine item={item} />

          <div className="my-4 h-1 bg-imprint" />

          {item.summary && <p className="mt-4 text-sm text-cover-body">{item.summary}</p>}

          {item.type === FILM && item.cast?.length > 0 && (
            <p className="mt-4 text-sm text-cover-body">{item.cast.join(', ')}</p>
          )}

          {loans.length > 0 && (
            <>
              {/* The record carries its own past: the ledger reads on the item itself.
                  `caps` sets ONLY text-transform/letter-spacing (DESIGN.md §3) — weight is
                  always stated at the point of use, so font-extrabold is explicit here rather
                  than assumed from the class. */}
              <h2 className="caps mt-6 text-[10px] font-extrabold tracking-[0.16em] text-imprint">
                The record
              </h2>
              <div className="mt-2 border-t-2 border-paper">
                {loans.slice(0, LEDGER_PREVIEW).map((loan) => (
                  <LedgerRow key={`${loan.lentAt}-${loan.name}`} loan={loan} inverted />
                ))}
              </div>
              {/* "Full record" used to be gated on "leads somewhere new" — more PAIRED loans
                  than the preview above already shows, or a raw-events `nextToken` (round 5
                  critique #5). That gate closed the one redundant case it was written for and, in
                  doing so, closed the ONLY route to `/history` for every item whose history pairs
                  into `<= LEDGER_PREVIEW` loans with no further page: clearing a lending history
                  exists nowhere but `/history`, so removing the "redundant" link removed the only
                  link. The fix is not a better threshold — it is that redundancy of ROWS was
                  never the right test, because the destination is not redundant even when it
                  shows the same rows: it holds a capability (clearing the record) this preview
                  does not. So the link renders whenever there is any lending history at all,
                  which this block already requires (`loans.length > 0`, above) — nothing further
                  to check. The label stays "Full record" either way: it is accurate whether or
                  not there happens to be more to read, a second label risks stating the same fact
                  twice, and the destructive action past the link is not something to advertise
                  from the preview. */}
              <Link
                to={`/libraries/${libraryId}/items/${itemId}/history`}
                // 48px floor (P1 #4): a standalone navigational control (not a prose link —
                // WCAG 2.5.5's inline-text exemption does not apply), whose text alone stood
                // 15.4px tall. Same `::before` hit-box as DetailMarks' "In" link, chosen here
                // too rather than the real-padding-plus-negative-margin idiom: this link sits
                // in normal block flow with nothing else measuring its natural height, so the
                // margin idiom would have been safe here specifically, but a single technique
                // for every enlarged text link is easier to verify than picking per-site.
                // -inset-y-4 (-16px) measured 47.4px in real Chrome — 0.6px under the floor,
                // since 15.4px of text plus 32px doesn't quite clear it; -5 (-20px) does, with
                // room to spare, and the action buttons below still sit ~9px clear of it.
                className="relative caps mt-4 inline-block text-[11px] font-extrabold text-imprint underline before:absolute before:inset-x-0 before:-inset-y-5 before:content-['']"
              >
                Full record
              </Link>
            </>
          )}

          {/* Read-only here can mean three different things (§7, "prefer the defects that
              cannot be reported"): not mine, not loaded yet, or the /libraries fetch failed.
              Silently hiding Lend/Edit/Delete for the third reason tells the owner nothing —
              a plausible, wrong story ("the app decided I may not act on my own item") with no
              error to report. This is the same block LibraryBrowse already shows for the same
              ambiguity, so the two screens fail the same honest way. */}
          {isReadOnly && librariesError && !library && (
            <div role="alert" className="mt-6 border-2 border-out p-4 text-sm">
              <p>Could not check whether this library is yours, so its actions are hidden.</p>
              <PlateButton variant="secondary" className="mt-4" onClick={refreshLibraries}>
                Try again
              </PlateButton>
            </div>
          )}

          {!isReadOnly && (
            <>
              {actionError && (
                // Ambient text is already `--paper` on this ground (inherited from the root
                // div below), which is correct here: this block sets no background of its own,
                // only a rule — the half-declaration rule in DESIGN.md §2 is about elements that
                // set a GROUND, not every bordered block.
                <p role="alert" className="mt-4 border-2 border-out p-4 text-sm">
                  {actionError}
                </p>
              )}

              {/* All three actions on one line: the circulation action (primary, acts or asks
                  for exactly what it needs, never a menu), Edit (secondary), Delete
                  (destructive). Delete used to sit apart at the foot, on the convention that a
                  destructive action is separated from the rest — but below the loan ledger and
                  below "Full record", a lone Delete read as though it deleted the RECORD, which
                  is a real action this app offers elsewhere (ItemHistory). Distance separated
                  the button from its own subject; grouped here it can only mean the item.
                  Hierarchy still reads because it is carried by treatment, not position — filled
                  plate, ink outline, red outline are three sharply different things in a row.
                  `flex-wrap` lets Delete drop to its own line on the narrowest phones: this is
                  reflow, not a second layout, and not an overflow. */}
              <div className="mt-6 flex flex-wrap gap-2">
                {isConfirmingDelete ? (
                  // NOT `alertdialog`: that role is a variant of `dialog` and assistive tech
                  // expects it to behave like one — focus trapped inside, Escape dismisses.
                  // Neither is true here (round 1 shipped the role with neither, which is the
                  // opposite defect — announcing a modal that does not act like one). This block
                  // genuinely is inline page content that appeared and must be noticed, not an
                  // overlay, so it is named as exactly that: a labelled `group` of controls, with
                  // the description carried by `aria-live` rather than a dialog's implicit one.
                  // `aria-label` on the group and the live-announced text below are two DIFFERENT
                  // facts (what this is vs. what it says), not the same fact twice.
                  <div
                    role="group"
                    aria-label={`Delete ${item.title}?`}
                    className="flex w-full flex-wrap gap-2"
                  >
                    {/* The live region IS the visible description — one node serves both
                        audiences, so nothing is written twice. `assertive` + `atomic`: a
                        destructive confirmation is exactly the "read it now, read all of it"
                        case `aria-live` exists for, and the immediately-following focus move
                        (below) is the second, redundant channel for the same announcement —
                        belt and suspenders for the AT/browser combinations that only pick up
                        one of the two.

                        Framed, not just spaced (round 5 critique #3): at the same size, colour
                        and margin as the summary paragraph above, this read as one more line of
                        prose rather than a destructive confirmation. A 2px `--out` TOP rule —
                        §6's own state-grammar treatment for a destructive block ("Error ...
                        with a 2px `--out` top rule"), not a new token and not a full box: `--out`
                        measures 4.42:1 against `--ink` on this cover, comfortably past the bar a
                        rule (not text) needs to clear. Ambient text stays `--paper`, inherited
                        from the root — the rule alone is what makes this read as its own thing
                        the instant it replaces the Delete trigger. */}
                    <p
                      aria-live="assertive"
                      aria-atomic="true"
                      className="mb-4 w-full border-t-2 border-out p-4 text-sm"
                    >
                      Delete <strong>{item.title}</strong> from this library? Its lending history
                      goes with it. This cannot be undone.
                    </p>
                    <PlateButton variant="danger" disabled={isDeleting} onClick={deleteItem}>
                      {isDeleting ? 'Deleting' : 'Delete for good'}
                    </PlateButton>
                    {/* The safe default gets the ref, never the destructive button beside it. */}
                    <PlateButton
                      ref={keepItRef}
                      variant="secondary"
                      onClick={() => setIsConfirmingDelete(false)}
                    >
                      Keep it
                    </PlateButton>
                  </div>
                ) : (
                  <>
                    {item.lentTo ? (
                      <PlateButton disabled={isReturning} onClick={markReturned}>
                        {isReturning ? 'Recording' : 'Mark returned'}
                      </PlateButton>
                    ) : (
                      <PlateButton onClick={() => setIsLending(true)}>Lend</PlateButton>
                    )}
                    <PlateButton
                      variant="secondary"
                      onClick={() => navigate(`/libraries/${libraryId}/items/${itemId}/edit`)}
                    >
                      Edit
                    </PlateButton>
                    <PlateButton
                      ref={deleteTriggerRef}
                      variant="danger"
                      onClick={() => setIsConfirmingDelete(true)}
                    >
                      Delete
                    </PlateButton>
                  </>
                )}
              </div>
            </>
          )}
        </main>
      )}

      {/* Mounted only while open, so a reader who never touches Lend never pulls in
          LendSheet's ToastContext dependency at all. Read-only is also enforced here,
          redundantly with the buttons above: absent, not disabled. */}
      {isLending && item && !isReadOnly && (
        <LendSheet
          item={item}
          libraryId={libraryId}
          open
          onClose={() => setIsLending(false)}
          // The write returns an empty body, so the item is re-read rather than assumed.
          onLent={load}
        />
      )}
    </div>
  );
};

export default ItemDetail;
