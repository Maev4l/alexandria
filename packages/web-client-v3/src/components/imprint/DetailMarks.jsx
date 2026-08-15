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

  if (!libraryName && !isSharedOut && !isSharedIn && !item.lentTo) return null;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-start gap-3 pl-2">
      {libraryName && (
        // "In" is an interface label and takes caps; the library name is content the reader
        // authored, so it never does (§3) — the same construction as FROM <owner>. It links
        // rather than sitting inert: arriving from search, the shelf is genuinely new
        // information, and the link underlines rather than takes --imprint, which would
        // compete with the title rule just below (DESIGN.md §5). `data-mark` is a stable hook
        // for check:browser's geometry assertion (a real-Chrome bounding-rect comparison a
        // stylesheet test cannot make) — content, not styling.
        <p data-mark="in" className="text-sm leading-[1.3] text-cover-body">
          <span className="caps text-[10px] font-extrabold tracking-[0.16em] text-cover-soft">
            In
          </span>{' '}
          <Link
            to={`/libraries/${item.libraryId}`}
            className="text-cover-body underline underline-offset-[3px]"
          >
            {libraryName}
          </Link>
        </p>
      )}

      {(isSharedOut || isSharedIn) && (
        // Pseudo-element hanging into the column's own padding-left, NEVER border-left — a
        // border adds to the box and pushes this one line right of IN/OUT beside it, which is
        // the regression the design session's own first attempt shipped and then fixed. The
        // text itself carries `data-mark`, not this outer relatively-positioned span: the edge
        // hangs OUTSIDE the text's own box, so the geometry check must measure the text, not a
        // box whose own left edge does not move regardless of how the edge is drawn.
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
