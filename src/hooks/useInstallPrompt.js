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

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visitCount] = useState(() => bumpVisitCount());
  const [installed, setInstalled] = useState(isInStandaloneMode());

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
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
    setDeferredPrompt(null);
    return choice;
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    } catch {
      // ignore — worst case the prompt reappears sooner than intended
    }
    setDeferredPrompt(null);
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
