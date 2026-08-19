// ONE camera stream, shared by both capture viewports and held for as long as the reader is
// inside the add flow.
//
// The defect this exists for: after every save the flow replaces back to the capture screen,
// which is a fresh mount, so the mount-only effect tore the stream down and called
// `getUserMedia` again — ten items, ten device-open-and-refocus cycles, each showing a black
// frame and `REQUESTING CAMERA ACCESS` before anything could be aimed at. DESIGN.md §4 accepts a
// harder reach for Add on the grounds that the flow LOOPS internally; if the loop justifies the
// layout then its per-iteration cost is what most deserves engineering.
//
// The lease's owner is a real thing rather than a timer: `AddFlowLayout` is the pathless layout
// route above the four add-flow routes, so it is mounted for exactly the span this stream should
// be open, and `releaseCameraStream` is its unmount. A grace window was the obvious alternative
// and is worse — the gap between leaving the capture screen and returning to it is however long
// the reader spends choosing a candidate, so any window short enough to be a safe privacy bound
// is too short to survive the loop.
//
// THE TRADE, stated so it is a decision rather than a discovery: the camera stays open while the
// reader is on the candidate list. That is inherent to not restarting it — it is equally true of
// keeping the capture screen mounted — and it ends the moment they leave the flow for the
// library, a detail screen, or anywhere else.

let cached = null;
let pending = null;
// Bumped by every release. A `getUserMedia` still in flight when the flow ends would otherwise
// resolve into `cached` AFTER the release that was supposed to stop it, leaving a live camera
// nobody holds and nothing to turn it off — an abandoned stream is a battery and privacy
// problem, which is the whole reason the original mount-only cleanup existed.
let generation = 0;

const isLive = (stream) => Boolean(stream?.getVideoTracks().some((track) => track.readyState === 'live'));

export const acquireCameraStream = () => {
  if (isLive(cached)) return Promise.resolve(cached);
  // A cached stream whose tracks have died (the OS reclaimed the device, another app took it)
  // is not reusable and must not be handed out: dropping it here is what makes a later
  // `acquire` re-request rather than attach a dead stream to a live element.
  cached = null;
  if (pending) return pending;

  const mine = generation;
  pending = navigator.mediaDevices
    .getUserMedia({ video: { facingMode: 'environment' } })
    .then((stream) => {
      if (mine !== generation) {
        // Released while this was in flight. Stop it here — the caller is gone.
        for (const track of stream.getTracks()) track.stop();
        return null;
      }
      cached = stream;
      pending = null;
      return stream;
    })
    .catch((err) => {
      pending = null;
      throw err;
    });
  return pending;
};

export const releaseCameraStream = () => {
  generation += 1;
  pending = null;
  if (cached) {
    for (const track of cached.getTracks()) track.stop();
    cached = null;
  }
};

// Test-only reset, so one spec's cached stream cannot answer the next one's `acquire`. Named for
// what it is rather than dressed up as production API.
export const __resetCameraStreamForTests = () => {
  generation += 1;
  pending = null;
  cached = null;
};
