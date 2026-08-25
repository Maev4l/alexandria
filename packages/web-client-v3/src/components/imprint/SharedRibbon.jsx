// Sharing is a library-level fact in this API — items are never individually shared — so
// this tag only ever appears on a library row, inline on a search row, or beside the
// item-detail hero (DESIGN.md §5 "Detail Marks"). Words first: colour alone would not be
// readable state.
//
// `--shared` measures ~3:1 on the black cover (DESIGN.md §2) — sound for an edge, far short of
// AA for text — so the `inverted` fork keeps the caps in `--cover-body` and leaves `--shared`
// to the edge rule the caller draws around this, exactly the discipline OverprintStamp already
// applies to `--out` (colour on the outline, words in a legible tone). The un-inverted fork sets
// the caps directly in `--shared`, which clears AA as text on paper (5.99:1).
//
// Weight is intentionally not set here: the `caps` rule (DESIGN.md §3) states weight only at
// the point of use, and callers differ (a library row's sub-line vs. the stacked cover marks).
const SharedRibbon = ({ direction, count, owner, inverted = false }) => {
  const tone = inverted ? 'text-cover-body' : 'text-shared';

  if (direction === 'out') {
    return <span className={tone}>Shared · {count}</span>;
  }

  return (
    <span className={tone}>
      From{' '}
      {/* The owner's address is content, not a label, so it drops whatever caps/tracking the
          caller applies to this whole tag — the same override the comp's own `.who` makes. */}
      <span className="normal-case text-[13px] font-normal tracking-normal">{owner}</span>
    </span>
  );
};

export default SharedRibbon;
