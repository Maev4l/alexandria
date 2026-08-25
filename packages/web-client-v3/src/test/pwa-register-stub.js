// `virtual:pwa-register/react` only exists when the VitePWA plugin is running, which it is not
// under vitest. This stub stands in for it so UpdatePrompt is testable at all; tests that care
// about update behaviour mock this module themselves.
export const useRegisterSW = () => ({
  needRefresh: [false, () => {}],
  offlineReady: [false, () => {}],
  updateServiceWorker: () => {},
});
