import SharedRibbon from '@/components/imprint/SharedRibbon.jsx';

// What a search row adds to a stream row, and nothing else. Results span every library the
// reader can see, so the shelf is the one fact a row here carries that the same row inside a
// library must not (DESIGN.md §6: "on a search row, where the library name genuinely is new
// information…").
//
// TWO facts, not one restated. `In <library>` says where the copy is filed; `From <owner>` says
// whose shelf that is, and only appears when the library was shared TO this reader. A library
// this reader owns carries the first alone.
//
// It is an INLINE tag and never a left edge rule, which is the whole reason this component
// exists rather than reusing the ribbon's edge construction from LibraryRow: the left edge is
// spoken for by the Overprint Stamp's `--out` rule, and one element gets one left edge
// (DESIGN.md §6). A lent book on someone else's shelf is a real row, and it must not have to
// choose which of its two states to show.
//
// `In` and `From` are interface labels and take the caps; the library name and the owner's
// address are content the reader authored and never do (§3) — the same construction the Detail
// Marks column uses beside the item-detail hero.
//
// Deliberately not a link, unlike `IN <library>` on item detail: this renders inside `ItemRow`'s
// own Link, so a nested anchor would be invalid markup and would give one row two destinations.
// Item detail is where the shelf becomes reachable in a tap, one screen along.
const SearchRowMarks = ({ libraryName, sharedFrom }) => {
  if (!libraryName && !sharedFrom) return null;

  return (
    <span className="mt-2 block text-[13px] leading-[1.3] text-ink-soft">
      {libraryName && (
        <>
          <span className="caps text-[10px] font-extrabold tracking-[0.16em]">In</span>{' '}
          <span className="text-ink">{libraryName}</span>
        </>
      )}
      {sharedFrom && (
        <>
          {libraryName && ' · '}
          {/* The caps/tracking live on this wrapper because SharedRibbon deliberately sets
              neither weight nor case itself (its own comment: callers differ). Its inner span
              resets the owner's address to sentence case at 13px. */}
          <span className="caps text-[10px] font-extrabold tracking-[0.16em]">
            <SharedRibbon direction="in" owner={sharedFrom} />
          </span>
        </>
      )}
    </span>
  );
};

export default SearchRowMarks;
