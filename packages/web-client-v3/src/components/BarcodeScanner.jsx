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
const BarcodeScanner = ({ onCode, onError }) => {
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
    <div className="relative aspect-[2/3] w-full max-w-[280px] border-2 border-ink">
      {/* Mounted from the first render so the ref exists before decodeFromConstraints needs it. */}
      <video ref={videoRef} muted playsInline className="size-full object-cover" />
      {state === 'requesting' && (
        <p
          aria-live="polite"
          className="caps absolute inset-0 flex items-center justify-center p-4 text-center text-[11px] font-bold text-ink-soft"
        >
          Requesting camera access
        </p>
      )}
    </div>
  );
};

export default BarcodeScanner;
