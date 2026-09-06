import { useCallback, useEffect, useState } from "react";

// Don't rely on the browser's native install heuristic (which fires
// whenever/however Chrome decides) — capture the event ourselves so the
// app controls *when* to ask, and only after the visitor has actually
// seen some value (2 meaningful visits), not on the very first cold
// load before they know what Tronites is.
const VISIT_COUNT_KEY = "tronites_visit_count";
const INSTALL_DISMISSED_KEY = "tronites_install_dismissed_at";
const MIN_VISITS_BEFORE_PROMPT = 2;
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

const isIos = () =>
  /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

const isInStandaloneMode = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

const bumpVisitCount = () => {
  try {
    const current = Number(localStorage.getItem(VISIT_COUNT_KEY) || "0");
    const next = current + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(next));
    return next;
  } catch {
    return MIN_VISITS_BEFORE_PROMPT; // storage unavailable — don't block the prompt on it
  }
};

const wasRecentlyDismissed = () => {
  try {
    const dismissedAt = Number(localStorage.getItem(INSTALL_DISMISSED_KEY) || "0");
    return Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
};

// ── Module-scope install-event capture ─────────────────────────────
// Chrome fires a single beforeinstallprompt per page load, as soon as
// the service worker + manifest pass the installability check — often
// while the visitor is still at the login screen. If the listener only
// exists inside a mounted hook (which runs after login), that one chance
// is lost for the whole session and the banner can never appear. Capture
// it here at module scope instead — this file is statically imported by
// App.jsx, so this runs at first bundle evaluation, well before login.
// The hook below just subscribes to this store.
let promptEvent = null;
let isAppInstalled = isInStandaloneMode();
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());

const subscribeToInstallPrompt = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

window.addEventListener("beforeinstallprompt", (event) => {
  // preventDefault() suppresses the browser's native banner so this app
  // decides when to ask — prompt() is invoked later by promptInstall().
  event.preventDefault();
  promptEvent = event;
  notify();
});

window.addEventListener("appinstalled", () => {
  promptEvent = null;
  isAppInstalled = true;
  notify();
});

const clearDeferredPrompt = () => {
  promptEvent = null;
  notify();
};

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(promptEvent);
  const [visitCount] = useState(() => bumpVisitCount());
  const [installed, setInstalled] = useState(isAppInstalled);

  useEffect(() => {
    // Mirror module-scope install events (new beforeinstallprompt,
    // appinstalled) into React state so this hook re-renders when they
    // arrive — the listener was registered at module scope so the
    // one-shot beforeinstallprompt isn't missed before login.
    const sync = () => {
      setDeferredPrompt(promptEvent);
      setInstalled(isAppInstalled);
    };
    return subscribeToInstallPrompt(sync);
  }, []);

  // Android/desktop Chrome: a real native prompt is available.
  const canPromptInstall =
    !installed &&
    Boolean(deferredPrompt) &&
    visitCount >= MIN_VISITS_BEFORE_PROMPT &&
    !wasRecentlyDismissed();

  // iOS Safari never fires beforeinstallprompt — there's no programmatic
  // install API at all, only the manual Share > Add to Home Screen path.
  // Surface a tooltip instead once the visit threshold is met.
  const shouldShowIosHint =
    !installed &&
    isIos() &&
    !isInStandaloneMode() &&
    visitCount >= MIN_VISITS_BEFORE_PROMPT &&
    !wasRecentlyDismissed();

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    clearDeferredPrompt();
    return choice;
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    } catch {
      // ignore — worst case the prompt reappears sooner than intended
    }
    clearDeferredPrompt();
  }, []);

  return {
    installed,
    canPromptInstall,
    shouldShowIosHint,
    promptInstall,
    dismiss,
  };
};

export default useInstallPrompt;
