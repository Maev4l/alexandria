// Type is marked structurally, never by colour: this tag, the spine rule on the frame, and
// the plate line's fields. All three survive with no artwork at all.
const LABELS = { 0: 'Book', 1: 'Film' };

const TypeTag = ({ type }) => (
  <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
    {LABELS[type]}
  </span>
);

export default TypeTag;
