// The handoff `AddItemSheet` starts by appending `?collectionId=<id>` to every branch it can
// reach — Book, Film — when opened from a collection board rather than the header "+". This is
// the one mechanism for the whole add flow, no per-branch exception: AddBook/AddVideo (still
// stubs) call this helper to build their own manual-entry link from it, and NewBook/NewVideo
// call it again once that link is followed. The same query contract
// `BookDetectionResults`/`VideoDetectionResults` are specified to use once built (slice D).
//
// A query parameter, not `location.state`: state is gone on a cold load — a fresh tab, a deep
// link, a PWA restart resuming this exact URL — so a reader who explicitly chose a board would
// silently resume filing standalone with no sign anything was lost. The query survives all of
// that, because it IS the URL. (An earlier version of this file let Book/Film keep `state` on
// the theory that their destinations were stubs with nothing to read it — true until AddBook/
// AddVideo gained the manual escape below, at which point that theory became the same defect
// this comment is describing, just deferred. There is no longer a branch where that deferral
// is safe.)
//
// Named as a mapping FROM the query, not "the collection case": Task 18 threads an ISBN through
// this identical door, and that should only mean reading one more parameter here, never a
// second branch anywhere that already consumes it. `isbn` flows the same way `collectionId`
// always has — AddBook reads it back out of BookDetectionResults' own query when it builds the
// "no match, enter by hand" link, so a reader who scanned a real barcode never has to type the
// digits a second time on the manual form (NewBook seeds `ItemForm`'s `isbn` field straight from
// this same `initial`, with no separate wiring).
export const seedFromAddFlowState = (search) => {
  const params = new URLSearchParams(search);
  return {
    collectionId: params.get('collectionId') ?? undefined,
    isbn: params.get('isbn') ?? undefined,
  };
};
