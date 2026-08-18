import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import PlateButton from '@/components/imprint/PlateButton.jsx';

const hasCamera = () =>
  typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

// The API's `image` field (openapi.yaml DetectRequest) wants bare base64 — `getScreenshot()`
// returns a full data URL, so the header is stripped here, once, at the source, rather than by
// every caller that happens to post it on.
const stripDataUrlPrefix = (dataUrl) => dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');

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
const CoverCapture = ({ onCapture, onError }) => {
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
    // A frame the browser could not produce (rare, but `getScreenshot` can return null before
    // the video element has real dimensions) is simply not reported — nothing to strip, nothing
    // to post, and the shutter stays available to try again.
    const dataUrl = webcamRef.current?.getScreenshot();
    if (dataUrl) onCapture(stripDataUrlPrefix(dataUrl));
  };

  return (
    <div>
      {/* Ruled, not filled (DESIGN.md §5): "ruled means the rule and nothing else" — a filled
          rectangle where a live picture belongs reads as a failed image before the stream ever
          attaches, the same reasoning that emptied VolumeFrame's and BarcodeScanner's boxes. */}
      <div className="relative aspect-[2/3] w-full max-w-[280px] border-2 border-ink">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
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
