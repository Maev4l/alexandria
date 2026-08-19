import { useEffect } from 'react';
import { releaseCameraStream } from '@/lib/cameraStream.js';
import { FilingSessionProvider } from '@/state/FilingSessionContext.jsx';

// The pathless layout route above the four add-flow routes. It owns the two things whose
// lifetime is exactly "the reader is cataloguing": the session tally, and the camera.
//
// Composed rather than merged, because they are genuinely two concerns that happen to share a
// span. Folding the camera lease into `FilingSessionProvider` would have made a component named
// for counting saved items also responsible for turning a device off.
// Module scope, not a ref: it has to survive this component being unmounted and immediately
// remounted, which is exactly the case it exists for.
let pendingRelease = null;

const AddFlowLayout = () => {
  // The camera's release. A capture screen borrows the shared stream and never stops it, because
  // every save remounts that screen and stopping it there is what made each item pay for a fresh
  // `getUserMedia` and sensor warmup. This is the other end: leaving the flow — for the library,
  // a detail screen, anywhere — unmounts this layout and turns the camera off.
  //
  // Deferred by one macrotask, and NOT as a grace window. React StrictMode double-invokes mount
  // effects in development (mount -> cleanup -> mount), so an immediate release here stopped the
  // stream the first mount had just acquired and forced a second `getUserMedia` — measured: the
  // camera opened twice on entering the flow, which is the exact cost this whole change removes,
  // reintroduced by its own cleanup. A remount cancels the pending release; a real unmount lets
  // it fire on the next tick, which is immediate in every sense a reader can perceive.
  //
  // Acquiring is the capture screens' business; this never opens anything, so releasing on a
  // flow the reader never pointed a camera at is a no-op.
  useEffect(() => {
    if (pendingRelease !== null) {
      clearTimeout(pendingRelease);
      pendingRelease = null;
    }

    // Backgrounding the app releases it too. Returning to a backgrounded app is not a loop
    // iteration, so this costs the cataloguing loop nothing — and it is what makes the trade
    // defensible in one sentence: the camera is open while the reader is inside the add flow AND
    // the app is in front of them. Without it the claim would be "open until they leave the
    // flow", which includes an app sitting backgrounded for an hour. Re-attaching on the way back
    // belongs to whichever viewport is on screen (`useReattachOnVisible`), since only a component
    // with a <video> can do it — and the results screen, which has none, correctly needs nothing.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') releaseCameraStream();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      pendingRelease = setTimeout(() => {
        pendingRelease = null;
        releaseCameraStream();
      }, 0);
    };
  }, []);

  return <FilingSessionProvider />;
};

export default AddFlowLayout;
