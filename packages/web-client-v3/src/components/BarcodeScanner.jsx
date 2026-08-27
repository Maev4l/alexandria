import { useEffect, useRef, useState } from 'react';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { BrowserMultiFormatReader } from '@zxing/browser';
import CaptureCaption from '@/components/CaptureCaption.jsx';
import { acquireCameraStream } from '@/lib/cameraStream.js';
import { useReattachOnVisible } from '@/lib/useReattachOnVisible.js';

// A book's own barcode is always one of these two symbologies (EAN-13 is what an ISBN-13
// prints as; EAN-8 covers the rarer short/compact editions) — restricting the reader to them
// means every decode attempt is checked against a stream that can only ever hold one of two
// shapes, not the library's full multi-format default (QR, PDF417, Aztec, ...) that nothing on
// a book cover ever produces.
const HINTS = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8]]]);

const hasCamera = () =>
  typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

// The MECHANISM only — permission request, continuous decode, stopping the stream on unmount
// (an abandoned camera is a battery and privacy problem, not just a leak). Most of the viewport's
// APPEARANCE still belongs to the design session working against a live device: no reticle, no
// scan line, no corner brackets, no wash, no spinner.
// ONE THING IS DRAWN OVER THE FEED, and this comment denied it for as long as it existed:
// `CaptureCaption`, a printed caps plate pinned to the frame's bottom edge, naming `requesting`
// and the caller's in-flight lookup. It is there because a viewport that has fired the slowest
// call in the product must say so — a decode is automatic, so without it the reader gets no sign
// the code was even read. Nothing else is drawn over the feed. The <video> is plain, and it sits
// in this component's OWN ruled box (see the box comment below for its shape), not in the caller's
// Volume Frame.
//
// States: `requesting` (permission not yet resolved), `scanning` (stream live, decoding every
// frame), and the two conditions that end the attempt — `unsupported` (no camera API at all,
// e.g. jsdom under every route-walking guard) and a caller-visible `onError` for the browser's
// own permission refusal. Neither renders an explanation here: this screen is reached from inside
// a caller that already knows what to say instead (AddBook replaces the whole viewfinder with an
// inline "type it below" message), so duplicating that copy in two places would be the same fact
// stated twice.
// `busy`: true while the CALLER has a lookup in flight for a code this component already
// reported. A decode is automatic — nothing here is tapped, unlike CoverCapture's shutter — so
// without this the reader gets no sign the code was even read, and the feed looks exactly like it
// is still scanning while a slow network request runs. The caller (not this component) decides
// when it's true, because only the caller knows whether the in-flight lookup was actually started
// BY a decode from this scanner, versus a manual-field submit sharing the same request — see
// AddBook.jsx's `busySource`. Narrating on every busy lookup regardless of origin would print
// "CODE READ" for a lookup no code ever triggered, which is worse than saying nothing.
const BarcodeScanner = ({ onCode, onError, busy = false }) => {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [state, setState] = useState(() => (hasCamera() ? 'requesting' : 'unsupported'));

  // The stream is released when the app goes to the background (AddFlowLayout); this takes a
  // fresh one on the way back. The decode loop is left alone deliberately — it scans the ELEMENT,
  // not the stream, so swapping `srcObject` underneath it resumes decoding with nothing restarted.
  useReattachOnVisible(videoRef, (err) => {
    setState('denied');
    onError(err);
  });

  useEffect(() => {
    // Mount-only, deliberately not keyed on `state`: `setState('scanning')` below is itself a
    // state transition, and an effect dependent on `state` would tear itself down and rebuild
    // the moment it fires — running this exact cleanup (`stop()`) on the stream it had just
    // opened, and flipping `cancelled` back to `true` out from under the still-registered decode
    // callback so no code could ever be reported. Both bugs showed up the same way: reproduced by
    // asserting `onCode` actually gets called and `stop()` does NOT run before the real unmount,
    // per this file's own "a guard must be shown to fail" rule for a check on its first write.
    if (!hasCamera()) {
      onError(new Error('NotSupportedError'));
      return undefined;
    }

    let cancelled = false;
    const reader = new BrowserMultiFormatReader(HINTS);

    // `decodeFromVideoElement`, NOT `decodeFromConstraints`. The difference is ownership:
    // `decodeFromConstraints` opens the device itself and registers a finalizer that disposes
    // the stream when the decode stops, so every remount — and the post-save loop is a remount
    // on every item — cost a fresh `getUserMedia` and a fresh sensor warmup. Verified in
    // `BrowserCodeReader.js`: `decodeFromVideoElement` calls `scan(element, callbackFn)` with no
    // finalizeCallback, so `controls.stop()` stops the decode loop and touches neither the
    // stream nor the element's source. The stream is ours to lend (see lib/cameraStream.js),
    // and it outlives this component by exactly the span the reader is in the add flow.
    const start = async () => {
      const stream = await acquireCameraStream();
      if (cancelled || !stream) return null;
      videoRef.current.srcObject = stream;
      return reader.decodeFromVideoElement(videoRef.current, (result) => {
        // The callback also fires on every frame with NO code found (a NotFoundException in
        // its error slot) — that is the ordinary state of a camera pointed at anything else,
        // not a failure, so only a real result is ever acted on here.
        if (!cancelled && result) onCode(result.getText());
      });
    };

    // React StrictMode double-invokes mount effects in dev (mount -> cleanup -> mount), and this
    // used to open a race: `decodeFromConstraints` owned the stream, both runs raced to attach
    // srcObject to the same shared <video>, and the discarded run's late `stop()` called
    // `cleanVideoSource()` — nulling the element's source out from under the run that survived.
    // A live LED, a sourceless element, nothing decoding. It was serialised behind a chain
    // promise so only one attempt was ever in flight.
    //
    // THE CHAIN IS GONE, because the redesign removed the window rather than guarding it.
    // Cleanup runs synchronously in the same commit as the mount effect, while `start` is still
    // awaiting the shared lease — so the discarded run is already `cancelled` when its stream
    // arrives and returns without ever calling the decoder. There is no second decode to
    // serialise, and `stop()` can no longer reach the stream or the element's source in any
    // case. Keeping the chain would have been a guard against a failure this file can no longer
    // produce: a no-op wearing a comment, which is the shape this project has paid for before.
    const attempt = start();

    attempt
      .then((controls) => {
        // `null` when the lease was released mid-acquire, or when this run was cancelled before
        // the stream arrived: there is no decode to stop and nothing to show.
        if (!controls) return;
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setState('scanning');
      })
      .catch((err) => {
        if (cancelled) return;
        setState('denied');
        onError(err);
      });

    return () => {
      cancelled = true;
      // Stops the DECODE LOOP, not the camera. The stream belongs to the add flow's lease
      // (lib/cameraStream.js) and is released by `AddFlowLayout` when the reader leaves the
      // flow — which is the whole point: a save remounts this component, and the next mount must
      // re-attach a stream that is still warm rather than re-open the device.
      controlsRef.current?.stop();
      controlsRef.current = null;
      // A decode still resolving is covered by the setup `.then()` above: `cancelled` is now
      // true, so it stops whatever controls it receives.
    };
    // `onCode`/`onError` are event callbacks the caller may pass as fresh inline functions on
    // every render; the effect reads their latest values through this closure at call time, so
    // there is nothing reactive to add here beyond the mount itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `denied`/`unsupported` render nothing: the caller has already been told via `onError` and,
  // per the boundary above, decides what replaces this component. Leaving a blank node here
  // (rather than this component's own copy) is what keeps the explanation in exactly one place.
  if (state === 'denied' || state === 'unsupported') return null;

  return (
    // Ruled, not filled: the Volume Frame's own fill was retired for exactly this reason ("a
    // filled rectangle where an image belongs reads as a failed image") and it applies here too
    // — before the stream attaches, this box is
    // waiting for a live picture the same way an empty frame is. The rule alone describes it.
    //
    // Full column width, fixed height 192px (24 divisions) — not the 2:3 Volume Frame ratio.
    // An EAN-13/EAN-8 barcode is landscape; a portrait window forced the reader to hold the
    // phone so a wide code occupied only a small fraction of a tall box. `@zxing` decodes from
    // `mediaElement.videoWidth/videoHeight` (`BrowserCodeReader.js:283-284`), the stream's
    // intrinsic size, so this box's CSS dimensions and the `scale-150` below play no part
    // DIRECTLY in what gets decoded — but the frame's shape decides where the reader holds the
    // phone, which decides what the sensor sees, and that indirect effect is real but
    // unmeasured; this comment makes no claim about decode success or scan accuracy.
    //
    // Height is a fixed division-scale value, not an aspect ratio, on purpose: this is a
    // targeting window sized to its subject, so its ratio may vary by device — unlike an
    // artwork frame, where imprecision is never acceptable. 192px is what makes the whole page
    // fit a 667px-tall phone with the manual escape above the fold; a taller frame pushed it
    // under, which is the one thing a manual escape may never do.
    //
    // `CoverCapture` follows the SAME rule to a different number: full column width by 240px,
    // landscape, because what that capture reads is a film's TITLE — the poster comes from TMDB
    // and never from the photograph. Two frames, one rule (match the subject), and this comment
    // asserted the opposite for four commits, describing a 2:3 portrait frame the app had
    // stopped rendering. Both figures here were stale numbers of mine, in someone else's file.
    //
    // `overflow-hidden` is required now that the video is scaled up past the box's own edges.
    <div className="relative h-48 w-full overflow-hidden border-2 border-ink">
      {/* Mounted from the first render so the ref exists before decodeFromConstraints needs it.
          The zoom is purely visual — see the box comment above — making a small code easier to
          aim at, never easier to decode. */}
      <video ref={videoRef} muted playsInline className="size-full scale-150 object-cover" />
      {state === 'requesting' && (
        <CaptureCaption>Requesting camera access</CaptureCaption>
      )}
      {/* Two facts, deliberately, because an automatic decode gives the reader neither for free:
          that a code was captured at all, and that a lookup for it is now running. CoverCapture's
          mirror only owes the second — a shutter press already tells the reader the first. Same
          vocabulary as the requesting caption above (caps, 11px, ink-soft, no spinner/overlay —
          the surface stays the design session's), because this is the SAME kind of thing: state
          text over a live, still-running feed, never a wash or a dimming. */}
      {state === 'scanning' && busy && (
        <CaptureCaption>Code read · looking it up</CaptureCaption>
      )}
    </div>
  );
};

export default BarcodeScanner;
