import { useEffect, useRef, useState } from 'react';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { BrowserMultiFormatReader } from '@zxing/browser';

// A book's own barcode is always one of these two symbologies (EAN-13 is what an ISBN-13
// prints as; EAN-8 covers the rarer short/compact editions) — restricting the reader to them
// means every decode attempt is checked against a stream that can only ever hold one of two
// shapes, not the library's full multi-format default (QR, PDF417, Aztec, ...) that nothing on
// a book cover ever produces.
const HINTS = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8]]]);

const hasCamera = () =>
  typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

// The MECHANISM only — permission request, continuous decode, stopping the stream on unmount
// (an abandoned camera is a battery and privacy problem, not just a leak). The viewport's
// APPEARANCE belongs to the design session working against a live device: no reticle, no scan
// line, no corner brackets, no overlay distinguishing scanning from decoding from found. A plain
// <video> inside the caller's Volume Frame, nothing drawn over it (ui-v3.md task 18 boundary).
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
  // Carries the PREVIOUS run's full settle+stop promise across a fast remount. Stays `null` for
  // the ordinary single-mount case, so decodeFromConstraints is still called synchronously there
  // exactly as before — it is only ever non-null in the window a back-to-back remount opens (see
  // the race note below).
  const chainRef = useRef(null);
  const [state, setState] = useState(() => (hasCamera() ? 'requesting' : 'unsupported'));

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

    const start = () =>
      reader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current,
        (result) => {
          // The callback also fires on every frame with NO code found (a NotFoundException in
          // its error slot) — that is the ordinary state of a camera pointed at anything else,
          // not a failure, so only a real result is ever acted on here.
          if (!cancelled && result) onCode(result.getText());
        },
      );

    // React StrictMode double-invokes mount effects in dev (mount -> cleanup -> mount), and
    // decodeFromConstraints is async (it awaits getUserMedia) — so the cleanup between the two
    // mounts can fire while the FIRST run's promise is still pending, well before its controls
    // are ever assigned. If the second run then calls decodeFromConstraints immediately, TWO
    // live attempts race against the same shared <video> element: whichever resolves second
    // assigns the element's srcObject and calls play(), and when the OTHER (stale, already
    // "cancelled") run's promise finally settles, its cleanup calls stop() on it — which zxing
    // implements as cleanVideoSource(), unconditionally nulling the element's srcObject again,
    // even though the element now belongs to the surviving run. That silently tears down a
    // stream that was never faulty: LED stays on, element goes sourceless, nothing decodes.
    //
    // Chaining this run's start behind the previous run's full settle+stop — rather than firing
    // both at once — guarantees only one decodeFromConstraints call is ever in flight against the
    // element, so a stale run's late stop() can only ever clear a stream that is still its own.
    const attempt = chainRef.current ? chainRef.current.then(start) : start();

    const settled = attempt
      .then((controls) => {
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
      // Stop immediately when the stream is already attached — synchronous, exactly as before,
      // so a real unmount (an abandoned camera) releases it without waiting on a microtask.
      controlsRef.current?.stop();
      controlsRef.current = null;
      // If decodeFromConstraints hasn't resolved yet, the setup `.then()` above already covers
      // it: `cancelled` is now true, so it calls `controls.stop()` on whatever it receives.
      // Chaining the next run's start against this same `settled` promise (rather than a fresh
      // `.then()`) is what makes that guarantee usable: once `settled` resolves, this run's
      // controls — if it ever got any — are already stopped, so the shared element is free.
      chainRef.current = settled;
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
    // Ruled, not filled: DESIGN.md §5 retired a `--paper-deep`/`--cover-rule` fill on the empty
    // Volume Frame for exactly this reason ("a filled rectangle where an image belongs reads as
    // a failed image") and it applies here too — before the stream attaches, this box is
    // waiting for a live picture the same way an empty frame is. The rule alone describes it.
    //
    // Full column width, fixed height 416px (52 divisions) — not the 2:3 Volume Frame ratio.
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
    // artwork frame, where imprecision is never acceptable. That is also why the film capture
    // frame (`CoverCapture`, out of scope here) stays the 2:3 Volume Frame ratio: a cover is
    // 2:3, so its viewfinder matches its subject exactly as this one now matches its own — one
    // rule applied twice, not an inconsistency.
    //
    // `overflow-hidden` is required now that the video is scaled up past the box's own edges.
    <div className="relative h-48 w-full overflow-hidden border-2 border-ink">
      {/* Mounted from the first render so the ref exists before decodeFromConstraints needs it.
          The zoom is purely visual — see the box comment above — making a small code easier to
          aim at, never easier to decode. */}
      <video ref={videoRef} muted playsInline className="size-full scale-150 object-cover" />
      {state === 'requesting' && (
        <p
          aria-live="polite"
          className="caps absolute inset-0 flex items-center justify-center p-4 text-center text-[11px] font-bold text-ink-soft"
        >
          Requesting camera access
        </p>
      )}
      {/* Two facts, deliberately, because an automatic decode gives the reader neither for free:
          that a code was captured at all, and that a lookup for it is now running. CoverCapture's
          mirror only owes the second — a shutter press already tells the reader the first. Same
          vocabulary as the requesting caption above (caps, 11px, ink-soft, no spinner/overlay —
          the surface stays the design session's), because this is the SAME kind of thing: state
          text over a live, still-running feed, never a wash or a dimming. */}
      {state === 'scanning' && busy && (
        <p
          aria-live="polite"
          className="caps absolute inset-0 flex items-center justify-center p-4 text-center text-[11px] font-bold text-ink-soft"
        >
          Code read · looking it up
        </p>
      )}
    </div>
  );
};

export default BarcodeScanner;
