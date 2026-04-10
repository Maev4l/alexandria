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
      if (registration) {
        // Check for updates periodically (every 60 seconds)
        setInterval(() => {
          registration.update();
        }, 60 * 1000);

        // Also check when app regains focus
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update();
          }
        });
      }
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
