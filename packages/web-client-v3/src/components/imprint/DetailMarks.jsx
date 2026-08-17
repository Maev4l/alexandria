import { Link } from 'react-router-dom';
import OverprintStamp from './OverprintStamp.jsx';
import SharedRibbon from './SharedRibbon.jsx';

// Beside the item-detail hero, everything true of the COPY rather than the work: where it is
// filed, who else can see it, whether it has left the building (DESIGN.md §5, "Detail Marks").
// Reading order mirrors that sentence — filed, then visible, then circulating. The ~210px next
// to a 132px frame was dead space until this column filled it.
//
// The column carries its own one-division left padding so the sharing mark's edge rule has
// somewhere to hang without shoving that line out of alignment with the two beside it — the
// exact defect the design session's own first `border-left` attempt produced (DESIGN.md §6:
// an edge rule never displaces content). `.item.lent::before` in the comp uses the same
// hang-into-the-padding construction for a whole row; here it is scoped to one stacked line.
const DetailMarks = ({ item, library, loans }) => {
  const sharedOutCount = library?.sharedTo?.length ?? 0;
  const sharedFrom = library?.sharedFrom;
  const isSharedOut = sharedOutCount > 0;
  const isSharedIn = Boolean(sharedFrom);
  const libraryName = library?.name;

  // IN <library> and SHARED/FROM are both facts about the LIBRARY the copy sits in; the stamp
  // below is a fact about the ITEM. Grouped here so the outer column can space the two groups
  // apart instead of listing all three at one uniform gap (round 5 critique: at a uniform gap
  // "SHARED · 2" read as though the BOOK itself were shared with two people, which the API
  // cannot even express — sharing is library-level).
  const hasLibraryFacts = Boolean(libraryName) || isSharedOut || isSharedIn;

  if (!hasLibraryFacts && !item.lentTo) return null;

  return (
    // The outer gap is 4 divisions (16px) — twice the gap-2 inside the library-facts group
    // below — so the group and the stamp read as two separate clusters rather than one list.
    // This gap only ever applies BETWEEN the two blocks below (it is inert whenever only one of
    // them renders), so it never touches the "IN" link's own hit-box geometry, which is
    // measured against its immediate gap-2 neighbour inside the nested group, unchanged here.
    <div className="flex min-w-0 flex-1 flex-col items-start gap-4 pl-2">
      {hasLibraryFacts && (
        <div className="flex flex-col items-start gap-2">
          {libraryName && (
            // "In" is an interface label and takes caps; the library name is content the reader
            // authored, so it never does (§3) — the same construction as FROM <owner>. It links
            // rather than sitting inert: arriving from search, the shelf is genuinely new
            // information, and the link underlines rather than takes --imprint, which would
            // compete with the title rule just below (DESIGN.md §5). `data-mark` is a stable
            // hook for check:browser's geometry assertion (a real-Chrome bounding-rect
            // comparison a stylesheet test cannot make) — content, not styling.
            <p data-mark="in" className="text-sm leading-[1.3] text-cover-body">
              <span className="caps text-[10px] font-extrabold tracking-[0.16em] text-cover-soft">
                In
              </span>{' '}
              <Link
                to={`/libraries/${item.libraryId}`}
                // 48px floor (P1 #4): this Link is genuinely inline, mid-sentence with "In" and
                // the space before it — vertical margin has no effect at all on an inline
                // (non-block) box, so the negative-margin idiom RowActions uses cannot apply
                // here. A `::before` hit-box does: absolutely positioned against the Link's own
                // `relative`, it extends the tappable region without asking the surrounding text
                // flow (or the flex column stacking this line above the sharing mark) to give it
                // any more room than it already has, so the green edge rule on the sharing mark
                // below (DESIGN.md §6: an edge rule never displaces content) stays exactly where
                // it is regardless of how this expands.
                //
                // The inset is ASYMMETRIC, not -inset-y-N: the group's own gap-2 (8px) between
                // this line and the sharing mark below is under half of what a ~15px line needs
                // (~16.5px/side) to clear 48px, so a symmetric inset unavoidably eats into that
                // sibling's own box — harmless today only because SharedRibbon has no click
                // handler of its own to steal a tap from (a future one would silently lose its
                // top ~7px with no error to report, per ui-v3.md §7's "defects that cannot be
                // reported"). This link is the column's FIRST item, beside a 198px VolumeFrame,
                // so there is ~25px of genuinely free space above it (down to the header's own
                // bottom edge) and only ~10px below before the sharing mark's box starts.
                // -top-[30px]/-bottom-[8px] spends that asymmetrically: 8px down leaves a real
                // ~2px clear of the sharing mark (verified in real Chrome, never overlapping it),
                // and the remaining reach goes up, past the header's edge into its own dead
                // space — confirmed harmless there too: this link's hit-box never leaves its own
                // ~188–231px column, clear of both the header's back button (4–52px) and its
                // search button (326–374px). Re-measured after round 5's regrouping: this
                // group's own internal gap-2 did not change (only the SPACE AFTER the group,
                // before the stamp, grew), so these figures still hold.
                //
                // The vertical fix above never mentioned the OTHER axis, and `before:inset-x-0`
                // gives it none: `left:0;right:0` just matches the pseudo's box to the Link's own
                // width, which is the library name's rendered text width — "Films" measured
                // 34.06px, "Bandes dessinées" (this file's other fixture library) measured well
                // past the floor, so the shortest name is the one that fails, and it is real
                // content, not a fixture artefact (p2 batch 2, finding 3). `left-1/2` plus
                // `-translate-x-1/2` centers the pseudo ON the Link regardless of its width, and
                // `w-[max(50px,100%)]` — 50, not exactly 48, for the same margin the vertical fix
                // already keeps against rounding — means the box is never narrower than 50px even
                // when the text is, and never narrower than the text either, for a long name. Pure
                // `position: absolute`, so — like the vertical inset beside it — it cannot push
                // any sibling: the sharing mark's edge rule two lines below shares this Link's
                // computed left/top only because `pl-2` on the outer column puts them there, not
                // because this pseudo-element does. Widening left of the Link's own edge reaches
                // into "In "'s own dead space exactly as the vertical version reaches into the
                // header's; "In" is a plain span with no click handler of its own, so — per the
                // same reasoning as the sharing mark below it — there is nothing there to steal a
                // tap from.
                className="relative text-cover-body underline underline-offset-[3px] before:absolute before:left-1/2 before:w-[max(50px,100%)] before:-translate-x-1/2 before:-top-[30px] before:-bottom-[8px] before:content-['']"
              >
                {libraryName}
              </Link>
            </p>
          )}

          {(isSharedOut || isSharedIn) && (
            // Pseudo-element hanging into the column's own padding-left, NEVER border-left — a
            // border adds to the box and pushes this one line right of IN/OUT beside it, which
            // is the regression the design session's own first attempt shipped and then fixed.
            // The text itself carries `data-mark`, not this outer relatively-positioned span:
            // the edge hangs OUTSIDE the text's own box, so the geometry check must measure the
            // text, not a box whose own left edge does not move regardless of how the edge is
            // drawn.
            <span className="relative caps text-[10px] font-extrabold tracking-[0.16em]">
              <span aria-hidden className="absolute inset-y-0 -left-2 w-1 bg-shared" />
              <span data-mark="shared">
                <SharedRibbon
                  inverted
                  direction={isSharedOut ? 'out' : 'in'}
                  count={sharedOutCount}
                  owner={sharedFrom}
                />
              </span>
            </span>
          )}
        </div>
      )}

      {item.lentTo && (
        <OverprintStamp
          inverted
          name={item.lentTo}
          days={loans?.find((loan) => loan.open)?.days}
        />
      )}
    </div>
  );
};

export default DetailMarks;
