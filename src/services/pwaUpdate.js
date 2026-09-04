// Manual SW registration (registerType: 'prompt', injectRegister: null in
// vite.config.js) instead of vite-plugin-pwa's auto-injected register
// script — this gives full control over *when* a waiting worker takes
// over, so a code update never yanks the rug out from under someone
// mid-scroll or mid-compose. The app surfaces "Update available" (see
// App.jsx) and only calls applyUpdate() on an explicit tap.

let waitingWorker = null;
let onUpdateAvailable = null;

export const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      // devOptions.type is forced to 'module' in vite.config.js (sw.js
      // uses ES imports), so registration type is 'module' in both envs.
      const swUrl = import.meta.env.DEV ? "/dev-sw.js?dev-sw" : "/sw.js";

      const registration = await navigator.serviceWorker.register(swUrl, {
        type: "module",
      });

      // A worker was already waiting before this page even attached its
      // listeners (e.g. a previous tab installed an update and this tab
      // just opened) — surface it immediately instead of only reacting
      // to future 'updatefound' events.
      if (registration.waiting) {
        waitingWorker = registration.waiting;
        onUpdateAvailable?.();
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // installed + there's already a controller means this is an
            // UPDATE, not the first-ever install — first install has no
            // existing controller and shouldn't prompt anything.
            waitingWorker = newWorker;
            onUpdateAvailable?.();
          }
        });
      });

      // Reload once the new worker actually takes control, but only as
      // a result of applyUpdate() below calling skipWaiting — not on an
      // unexpected controller change, which would reload the page out
      // from under someone unprompted.
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (err) {
      console.error("Service worker registration failed:", err);
    }
  });
};

// Lets App.jsx subscribe to "an update is ready" without polling.
export const subscribeToUpdates = (callback) => {
  onUpdateAvailable = callback;
};

export const isUpdateAvailable = () => waitingWorker !== null;

export const applyUpdate = () => {
  waitingWorker?.postMessage({ type: "SKIP_WAITING" });
};

// Lets the service worker's notificationclick handler drive in-app
// navigation for an already-open tab (postMessage NAVIGATE) instead of
// only being able to open a fresh window.
export const subscribeToPushNavigation = (navigate) => {
  if (!("serviceWorker" in navigator)) return () => {};

  const handler = (event) => {
    if (event.data?.type === "NAVIGATE" && event.data.url) {
      navigate(event.data.url);
    }
  };
  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
};
