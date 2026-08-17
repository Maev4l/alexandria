// The handoff `AddItemSheet` starts by putting a `collection` on `location.state` when it is
// opened from a collection board rather than the header "+" — the same `location.state` shape
// `BookDetectionResults`/`VideoDetectionResults` are specified to receive, read here one hop
// earlier for the manual-entry branch of the same flow (NewBook/NewVideo).
//
// Named as a mapping FROM state, not "the collection case": Task 18 threads an ISBN through
// this identical door, and that should only mean adding a second field to the object this
// returns, never a second branch anywhere that already consumes it.
export const seedFromAddFlowState = (state) => ({
  collectionId: state?.collection?.id,
});
