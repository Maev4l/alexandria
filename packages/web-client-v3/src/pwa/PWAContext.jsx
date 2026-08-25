import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// WITHOUT A PROMPT THE APP CANNOT BE UPDATED AT ALL. `registerType: 'prompt'` installs a new
// worker and then WAITS; it activates only on a SKIP_WAITING message, which
// `updateServiceWorker(true)` is the thing that sends. Nothing sending it means the waiting worker
// waits for ever and every navigation is answered from the previous build's precache.
//
// The trap is one release AFTER cutover, not the cutover: v2 has a working prompt, so it yields
// to v3. But if v3 took control without one, the first post-cutover fix could never be delivered —
// the build carrying the fix is the build that cannot arrive.
//
// WHY THIS IS A PROVIDER AND NOT JUST THE NOTICE. `useRegisterSW` must be called once, and the
// registration it hands back is the only thing that can be asked to check. Owning it here lets a
// screen offer a MANUAL check, which is the part reported missing from the deployed app — and the
// reason it matters is not impatience: an automatic prompt that has nothing to announce and a
// broken one look identical from the outside. A reader cannot tell "no new build" from "the
// update mechanism is dead" without a control that answers.
export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Exported so a screen's own test can supply a state directly — the alternative is driving
// `useRegisterSW` through a mock to reach a two-line branch.
export const PWAContext = createContext(null);

export const PWAProvider = ({ children }) => {
  const registrationRef = useRef(null);
  // 'idle' | 'checking' | 'current' | 'failed' — reported by whoever renders the control, so a
  // check that found nothing SAYS so rather than looking like a check that did not run.
  const [checkState, setCheckState] = useState('idle');

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      registrationRef.current = registration;

      // Hourly, NOT every 60s. A tighter interval does not deliver versions faster — it only
      // widens exposure to a divergent edge copy of the app shell, which reinstalls a "new"
      // waiting worker and produces a phantom prompt with no real deploy behind it.
      setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL_MS);

      // The trigger that actually matters on a phone: check the moment the reader comes back.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
      });
    },
  });

  const checkForUpdate = useCallback(async () => {
    const registration = registrationRef.current;
    // No registration means no service worker took control — on a dev server, or if registration
    // failed. Reported as a failure rather than as "up to date", which would be a lie of exactly
    // the kind this project has refused elsewhere: the check did not run.
    if (!registration) {
      setCheckState('failed');
      return;
    }
    setCheckState('checking');
    try {
      await registration.update();
      // `needRefresh` flips through the hook if a new worker installs, and the notice appears on
      // its own. Reaching here having found nothing is the ordinary case and the one that needs
      // saying out loud.
      setCheckState('current');
    } catch {
      setCheckState('failed');
    }
  }, []);

  const applyUpdate = useCallback(() => {
    // `true` is the whole point: it posts SKIP_WAITING and reloads on controllerchange. Called
    // without it, the notice would appear and change nothing.
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  return (
    <PWAContext.Provider value={{ needRefresh, checkForUpdate, applyUpdate, checkState }}>
      {children}
    </PWAContext.Provider>
  );
};

// Returns an inert session when no provider is above — the screens that use it are also rendered
// by their own unit tests, one route at a time, and making this throw would force every one of
// them to grow a provider to test something they are not testing.
const NO_PWA = { needRefresh: false, checkForUpdate: async () => {}, applyUpdate: () => {}, checkState: 'failed' };

export const usePWA = () => useContext(PWAContext) ?? NO_PWA;
