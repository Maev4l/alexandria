// Sharing is a library-level fact in this API — items are never individually shared — so
// this tag only ever appears on a library row or, inline, on a search row. Words first:
// colour alone would not be readable state.
const SharedRibbon = ({ direction, count, owner }) =>
  direction === 'out' ? (
    <span className="font-bold text-shared">Shared · {count}</span>
  ) : (
    <span className="font-bold text-shared">From {owner}</span>
  );

export default SharedRibbon;
