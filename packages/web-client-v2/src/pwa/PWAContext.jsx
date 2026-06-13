// PWA update context - exposes update state and manual check function
import { createContext, useContext, useCallback, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const PWAContext = createContext(null);

export const PWAProvider = ({ children }) => {
  const registrationRef = useRef(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      registrationRef.current = registration;
      if (!registration) return;

      // Background safety net: catch a deploy while the app sits open and idle in
      // the foreground. Hourly is enough because visibilitychange (below) handles
      // the common case, so a tighter interval would only add nagging, not speed.
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      // Primary trigger: re-check the instant the user returns to the app. This is
      // what makes a fresh deploy show up quickly for normal foreground/background usage.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });
    },
  });

  // Manual update check - returns true if check was triggered
  const checkForUpdate = useCallback(async () => {
    if (registrationRef.current) {
      await registrationRef.current.update();
      return true;
    }
    return false;
  }, []);

  // Apply the pending update
  const applyUpdate = useCallback(() => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  return (
    <PWAContext.Provider value={{ needRefresh, checkForUpdate, applyUpdate }}>
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};
