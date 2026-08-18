// The "Filing into <name>" mark, shared by every screen a cataloguing session touches: the two
// capture screens (AddBook, AddVideo) where the session actually SITS, and the two candidate-list
// screens (BookDetectionResults, VideoDetectionResults) it passes through briefly, N times per
// session. Printed, never a toast, for exactly that reason — it must survive being ignored for a
// whole session of back-to-back scans, which is precisely the property a mark shown only on the
// screen that flashes past does not have (ui-v3.md ruling E; task-19 fix round 3). Its absence is
// what says "standalone": no `collectionId`, no name, no mark, on every one of these four screens
// alike — never a gate on what the screen can otherwise do.
//
// The caps belong to the LABEL only — the collection name is content the reader authored, and
// DESIGN.md §3 forbids uppercasing content titles. `caps` on the outer <p> would otherwise
// inherit onto the name via `text-transform`, which is exactly the defect SharedRibbon.jsx
// already solved for `FROM <owner>`: the name gets its own `normal-case` reset, same
// construction, copied rather than reinvented. `data-mark` is a stable hook for
// check:browser's computed-style assertion, per DetailMarks.jsx's own convention — content, not
// styling.
const FilingInto = ({ name }) => {
  if (!name) return null;
  return (
    <p className="caps mb-4 text-[11px] font-bold tracking-[0.16em] text-ink-soft">
      Filing into{' '}
      <span
        data-mark="filing-into-name"
        className="normal-case text-[13px] font-normal tracking-normal"
      >
        {name}
      </span>
    </p>
  );
};

export default FilingInto;
