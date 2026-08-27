// The handoff `AddItemSheet` starts by appending `?collectionId=<id>` to every branch it can
// reach — Book, Film — when opened from a collection board rather than the header "+". This is
// the one mechanism for the whole add flow, no per-branch exception: AddBook/AddVideo — both
// shipped screens, not stubs — call this helper to build their own manual-entry link from it,
// and NewBook/NewVideo call it again once that link is followed. `BookDetectionResults` and
// `VideoDetectionResults` use the same query contract.
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
//
// Task 19 adds `title` for the identical reason on the video side: VideoDetectionResults' own
// "no match, enter by hand" link carries the searched (or OCR-corrected) title back through this
// same door, so NewVideo can seed `ItemForm`'s title field from it — one more parameter read
// here, still no second branch.
export const seedFromAddFlowState = (search) => {
  const params = new URLSearchParams(search);
  return {
    collectionId: params.get('collectionId') ?? undefined,
    isbn: params.get('isbn') ?? undefined,
    title: params.get('title') ?? undefined,
  };
};

// A results route (`add/book/results`, `add/video/results`) reached with NO identifying input at
// all — no `?isbn=`, no `?title=` — has nothing to resolve. `routes.jsx`'s `guard()` checks only
// that a user is signed in, not that the query it lands on makes sense, so a typed, edited, or
// bookmarked-mid-flow URL reaches this with total reliability, on both flows identically.
//
// This used to read "the photo wasn't kept" on the video side — wrong for two reasons fix round 1
// found: nothing was ever lost (there was never an input to lose), and once the OCR path is
// unified with the typed one (see AddVideo/VideoDetectionResults), no photo is anywhere in this
// flow's recovery path for the message to refer to. The book side had the same shape under a
// different, ISBN-specific sentence and was never given this construction at all. One meaning —
// this results route has no input to resolve — deserves one shared sentence and one shared
// mechanism (redirect to the capture screen, `state: { noInput: true }`), not a type-specific
// story invented per screen. Which capture screen to redirect to, and what (if any) collection to
// carry along, differ by type — that is a parameter each results screen supplies, not a reason to
// build a framework around a two-line redirect.
export const NO_INPUT_MESSAGE = 'There was nothing to look up. Search again below.';
