import { useEffect } from 'react';
import { acquireCameraStream } from '@/lib/cameraStream.js';

// The other half of the visibility release (`AddFlowLayout`). Backgrounding the app stops the
// shared stream; coming back has to start one again, and only a component with a <video> can
// re-attach it.
//
// This costs the cataloguing loop nothing, which is the point: returning to a backgrounded app is
// not a loop iteration. What it buys is a claim that can be defended in one sentence — the camera
// is open while the reader is inside the add flow AND the app is in front of them — rather than
// "open until they leave the flow", which includes an app sitting backgrounded for an hour.
//
// Shared by both viewports because both need exactly this and neither needs anything more: the
// decode loop keeps scanning the same element across the swap, so nothing has to be restarted.
export const useReattachOnVisible = (videoRef, onFailure) => {
  useEffect(() => {
    let cancelled = false;
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      acquireCameraStream()
        .then((stream) => {
          if (cancelled || !stream || !videoRef.current) return;
          videoRef.current.srcObject = stream;
        })
        .catch((err) => {
          // Permission can genuinely be revoked while the app is in the background, so a failure
          // here is a real denial and must reach the caller rather than leaving a dead frame.
          if (!cancelled) onFailure(err instanceof Error ? err : new Error(String(err)));
        });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    // `videoRef` is a ref (stable) and `onFailure` is read through this closure at call time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
