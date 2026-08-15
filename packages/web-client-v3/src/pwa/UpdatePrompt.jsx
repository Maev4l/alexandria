import { useRegisterSW } from 'virtual:pwa-register/react';
import UpdateNotice from './UpdateNotice.jsx';

// WITHOUT THIS THE APP CANNOT BE UPDATED AT ALL, which is why it ships before anything else in
// the PWA task. `registerType: 'prompt'` means a new worker installs and then WAITS; it activates
// only on a SKIP_WAITING message, which `updateServiceWorker(true)` is the thing that sends.
// Nothing sent it, so the waiting worker waited forever and every navigation was answered from
// the previous build's precache — never reaching CloudFront, whose no-cache header on the app
// shell is therefore correct and irrelevant.
//
// The trap is one release AFTER cutover, not the cutover itself: v2 has a working prompt, so it
// yields to v3 when v3 ships. But if v3 takes control without one, the first post-cutover fix can
// never be delivered — the build carrying the fix is the build that cannot arrive, and the only
// recovery is asking every reader to close every tab.
export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

const UpdatePrompt = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // Hourly, NOT every 60s. A tighter interval does not deliver versions faster — it only
      // widens exposure to a divergent edge copy of the app shell, which reinstalls a "new"
      // waiting worker and produces the phantom update prompt with no real deploy behind it.
      setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL_MS);

      // The trigger that actually matters for a phone: check the moment the reader comes back.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
      });
    },
  });

  if (!needRefresh) return null;
  // `true` is the whole point: it posts SKIP_WAITING and reloads on controllerchange. Called
  // without it, the notice would appear and change nothing.
  return <UpdateNotice onApply={() => updateServiceWorker(true)} />;
};

export default UpdatePrompt;
