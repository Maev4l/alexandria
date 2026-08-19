import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import PlateButton from '@/components/imprint/PlateButton.jsx';

const hasCamera = () =>
  typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

// The API's `image` field (openapi.yaml DetectRequest) wants bare base64 — a canvas data URL
// carries a header — so it is stripped here, once, at the source, rather than by every caller
// that happens to post it on.
const stripDataUrlPrefix = (dataUrl) => dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');

// `react-webcam`'s own `getScreenshot()`/`getCanvas()` has two compounding defects for this
// frame (verified in `react-webcam.js:278-280`, `:421`): it sizes the capture canvas off the
// VIDEO ELEMENT'S RENDERED width (`video.clientWidth`, ~280px — `forceScreenshotSourceSize`
// defaults `false`) rather than the sensor's real resolution, and it draws the WHOLE sensor
// frame while the on-screen preview shows only the centre crop `object-cover` selects. So the
// reader carefully frames a title and the upload contains a wider scene they never saw, with the
// framed region occupying a fraction of an already-small image.
//
// This computes the exact source rectangle `object-cover` is displaying for a given container
// aspect, so a canvas draw from the underlying `<video>` element reproduces WHAT THE READER
// FRAMED, at the sensor's own resolution — by construction, not by a rule someone has to
// remember to keep in step with the CSS.
const objectCoverSourceRect = (videoWidth, videoHeight, containerAspect) => {
  const videoAspect = videoWidth / videoHeight;
  if (videoAspect > containerAspect) {
    // The sensor is relatively WIDER than the frame: object-cover keeps the full height and
    // crops the left/right edges.
    const sHeight = videoHeight;
    const sWidth = videoHeight * containerAspect;
    return { sx: (videoWidth - sWidth) / 2, sy: 0, sWidth, sHeight };
  }
  // The sensor is relatively TALLER than the frame: object-cover keeps the full width and crops
  // the top/bottom edges.
  const sWidth = videoWidth;
  const sHeight = videoWidth / containerAspect;
  return { sx: 0, sy: (videoHeight - sHeight) / 2, sWidth, sHeight };
};

// `webcamRef.current.video` is the underlying <video> element: `Webcam` is a class component
// (not itself wrapped in `forwardRef`), so its instance ref exposes the `this.video` property it
// assigns in its own render (`react-webcam.js:409`) directly — no imperative-handle indirection
// to go through.
//
// The container aspect is read from THIS SAME ELEMENT'S rendered box (`clientWidth`/
// `clientHeight`), not a second hand-written `2 / 3` constant mirroring the CSS. The <video> is
// `size-full` inside its 2:3 parent, so its own rendered box IS the frame `object-cover` is
// fitting into — reading it here means there is only ONE place the aspect is ever written down
// (the CSS), and nothing to drift out of step with it. A hardcoded ratio would silently crop a
// region the preview never showed the moment the CSS box's spec changed and this constant did
// not; deriving it removes that possibility rather than adding a test to catch it.
const captureFramedRegion = (video) => {
  if (!video?.videoWidth || !video?.videoHeight || !video?.clientWidth || !video?.clientHeight) {
    // Also covers a video not yet laid out (zero-size rendered box): a division by its height
    // would otherwise produce NaN geometry, which fails far more confusingly downstream (a
    // canvas of NaN×NaN, a drawImage that silently no-ops) than a clean, retryable bail.
    return null;
  }
  const containerAspect = video.clientWidth / video.clientHeight;
  const { sx, sy, sWidth, sHeight } = objectCoverSourceRect(
    video.videoWidth,
    video.videoHeight,
    containerAspect,
  );
  const canvas = document.createElement('canvas');
  // Output dimensions ARE the source rectangle: the framed region at the sensor's own
  // resolution, never resampled to the element's rendered size or any other figure.
  canvas.width = Math.round(sWidth);
  canvas.height = Math.round(sHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.92);
};

// The MECHANISM only — permission request and a manual shutter — same boundary BarcodeScanner
// draws (ui-v3.md task 19): the viewport's APPEARANCE belongs to the design session working
// against a live device. No reticle, no framing guide, no capture animation, no mark
// distinguishing requesting from ready. A plain <video> inside an ink-ruled 2:3 box, nothing
// drawn over it.
//
// No auto-capture: a reader holding a DVD case chooses the moment (PRODUCT.md, task brief). The
// shutter is a real button, not a tap-the-viewport gesture, so it survives being duplicated by a
// screen reader the same way every other action in this system does.
//
// States mirror BarcodeScanner's: `requesting` (permission not yet resolved), `ready` (stream
// live, shutter enabled), and the two conditions that end the attempt — `unsupported` (no camera
// API at all) and a caller-visible `onError` for the browser's own permission refusal. Neither
// renders an explanation here: this component is reached from inside a caller (AddVideo) that
// already knows what to say instead (replacing the whole viewfinder with an inline "type it
// below" message), so duplicating that copy here would be the same fact stated twice.
// `busy`: true while the CALLER has a lookup in flight for a frame this shutter already captured.
// Unlike BarcodeScanner's decode, a shutter press is self-acknowledging — the reader tapped it —
// so this owes only the ONE remaining fact: that the lookup it started is still running. The
// caller decides when it's true (AddVideo.jsx's `busySource`), because the same lookup call is
// also reachable from the manual title field, and narrating here for a title-only lookup would
// claim a cover lookup that never happened.
const CoverCapture = ({ onCapture, onError, busy = false }) => {
  const webcamRef = useRef(null);
  const [state, setState] = useState(() => (hasCamera() ? 'requesting' : 'unsupported'));

  useEffect(() => {
    if (!hasCamera()) {
      onError(new Error('NotSupportedError'));
    }
    // No cleanup beyond what react-webcam's own componentWillUnmount already does (it stops its
    // stream): nothing here needs to duplicate that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `denied`/`unsupported` render nothing: the caller has already been told via `onError` and
  // decides what replaces this component (BarcodeScanner's identical rule, same reason).
  if (state === 'denied' || state === 'unsupported') return null;

  const onShutter = () => {
    // A frame the browser could not produce yet (rare, but the video can still lack real
    // dimensions in the instant right after `onUserMedia` fires) is simply not reported —
    // nothing to strip, nothing to post, and the shutter stays available to try again.
    const dataUrl = captureFramedRegion(webcamRef.current?.video);
    if (dataUrl) onCapture(stripDataUrlPrefix(dataUrl));
  };

  return (
    // Centred, so the viewfinder has equal space left and right rather than sitting flush
    // against the column's left margin with all the slack on one side. `w-fit` keeps the
    // wrapper as wide as the frame, so `mx-auto` centres the frame itself rather than a
    // full-width box that merely contains it — and the shutter beneath centres with it, since
    // a centred camera over a left-aligned button reads as a mistake rather than a choice.
    <div className="mx-auto flex w-fit flex-col items-center">
      {/* Ruled, not filled (DESIGN.md §5): "ruled means the rule and nothing else" — a filled
          rectangle where a live picture belongs reads as a failed image before the stream ever
          attaches, the same reasoning that emptied VolumeFrame's and BarcodeScanner's boxes.
          140px, not 280: now that capture draws from the sensor's own resolution rather than
          this box's rendered size (`captureFramedRegion` above), the preview's size has no
          bearing on what gets read, so halving it is a pure layout choice. */}
      <div className="relative aspect-[2/3] w-full max-w-[140px] border-2 border-ink">
        <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={{ facingMode: 'environment' }}
          onUserMedia={() => setState('ready')}
          onUserMediaError={(err) => {
            setState('denied');
            onError(err instanceof Error ? err : new Error(String(err)));
          }}
          className="size-full object-cover"
        />
        {state === 'requesting' && (
          <p
            aria-live="polite"
            className="caps absolute inset-0 flex items-center justify-center p-4 text-center text-[11px] font-bold text-ink-soft"
          >
            Requesting camera access
          </p>
        )}
        {/* One fact, matching the control that was tapped — see the prop comment above for why
            this is a single-fact string where BarcodeScanner's is two. Same vocabulary as the
            requesting caption: caps text over the still-live feed, no spinner or wash, because
            the shutter below stays tappable throughout (deliberately not disabled — see AddVideo
            and CoverCapture.test.jsx's own "explicitly out of scope" case). */}
        {state === 'ready' && busy && (
          <p
            aria-live="polite"
            className="caps absolute inset-0 flex items-center justify-center p-4 text-center text-[11px] font-bold text-ink-soft"
          >
            Looking up this cover
          </p>
        )}
      </div>
      {state === 'ready' && (
        // "Capture cover" used to name a step that completed nothing on its own — it filled a
        // field a DIFFERENT button then had to act on. The shutter now runs the whole lookup by
        // itself (AddVideo's `onCaptured`), so its label names that outcome, paired with the
        // manual field's own "Look up this title" (one-call-capture task).
        <PlateButton variant="secondary" className="mt-4" onClick={onShutter}>
          Look up this cover
        </PlateButton>
      )}
    </div>
  );
};

export default CoverCapture;
