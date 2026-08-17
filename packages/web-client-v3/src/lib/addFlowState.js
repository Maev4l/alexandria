// The handoff `AddItemSheet` starts by appending `?collectionId=<id>` to the manual-entry route
// when it is opened from a collection board rather than the header "+" — the same query
// contract `BookDetectionResults`/`VideoDetectionResults` are specified to use once built
// (slice D), read here one hop earlier for the manual-entry branch of the same flow
// (NewBook/NewVideo).
//
// A query parameter, not `location.state`: state is gone on a cold load — a fresh tab, a deep
// link, a PWA restart resuming this exact URL — so a reader who explicitly chose a board would
// silently resume filing standalone with no sign anything was lost. The query survives all of
// that, because it IS the URL.
//
// Named as a mapping FROM the query, not "the collection case": Task 18 threads an ISBN through
// this identical door, and that should only mean reading one more parameter here, never a
// second branch anywhere that already consumes it.
export const seedFromAddFlowState = (search) => ({
  collectionId: new URLSearchParams(search).get('collectionId') ?? undefined,
});
