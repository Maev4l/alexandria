import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import VolumeFrame from '@/components/imprint/VolumeFrame.jsx';
import DetailMarks from '@/components/imprint/DetailMarks.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import LedgerRow from '@/components/imprint/LedgerRow.jsx';
import ItemActionsSheet from '@/components/ItemActionsSheet.jsx';
import { Search } from '@/components/icons';
import { eventsApi, itemsApi } from '@/api';
import { detailLineParts } from '@/lib/format';
import { pairLoanEvents } from '@/lib/loans';
import { useLibraries } from '@/state/LibrariesContext.jsx';

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
  const { canAct, byId } = useLibraries();
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
  const [isActing, setIsActing] = useState(false);

  // Deliberately does NOT flip `status` to 'loading' itself — that is left to the effect below,
  // which owns the initial/route-driven fetch. `onChanged` calls this directly after a lend or
  // return, and re-reading quietly (content stays on screen) is the point: a mutation returns an
  // empty body, so the item must be re-read, but the reader should not see the whole cover blank
  // out just to confirm what they already just did.
  const load = useCallback(async () => {
    try {
      const [fetchedItem, events] = await Promise.all([
        itemsApi.get(libraryId, itemId),
        eventsApi.list(libraryId, itemId, { limit: 20 }).catch(() => ({ events: [] })),
      ]);
      setItem(fetchedItem);
      setLoans(pairLoanEvents(events?.events ?? []));
      setStatus('ready');
    } catch (err) {
      setStatus(err.status === 404 ? 'missing' : 'error');
    }
  }, [libraryId, itemId]);

  useEffect(() => {
    setStatus('loading');
    load();
  }, [load]);

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
        <main className="p-6" aria-busy="true">
          <h1 className="sr-only">Item detail</h1>
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
            <VolumeFrame item={item} hero />
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
              <Link
                to={`/libraries/${libraryId}/items/${itemId}/history`}
                className="caps mt-4 inline-block text-[11px] font-extrabold text-imprint underline"
              >
                Full record
              </Link>
            </>
          )}

          {!isReadOnly && (
            <div className="mt-6 flex gap-2">
              <PlateButton onClick={() => setIsActing(true)}>
                {item.lentTo ? 'Mark returned' : 'Lend'}
              </PlateButton>
              <PlateButton
                variant="secondary"
                onClick={() => navigate(`/libraries/${libraryId}/items/${itemId}/edit`)}
              >
                Edit
              </PlateButton>
            </div>
          )}
        </main>
      )}

      {/* Mounted only while open — not merely hidden by the `open` prop — so a reader who never
          touches Lend/Edit never pulls in ItemActionsSheet's ToastContext dependency at all.
          Read-only is also enforced here, redundantly with the buttons above: absent, not
          disabled. */}
      {isActing && item && !isReadOnly && (
        <ItemActionsSheet
          item={item}
          libraryId={libraryId}
          open
          onClose={() => setIsActing(false)}
          // PUT and POST return empty bodies, so the item is re-read rather than assumed.
          onChanged={load}
        />
      )}
    </div>
  );
};

export default ItemDetail;
