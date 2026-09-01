import { useState } from "react";
import { FiShare, FiX } from "react-icons/fi";
import useInstallPrompt from "../hooks/useInstallPrompt";

// Visual idea: a small "dock tile" preview — the app icon sitting in a
// rounded square the way it will actually look on a home screen — rather
// than a generic horizontal banner with a plain "Install" button. Makes
// the ask concrete (this is what you'll get) instead of abstract.
const InstallPrompt = () => {
  const { canPromptInstall, shouldShowIosHint, promptInstall, dismiss } =
    useInstallPrompt();
  const [installing, setInstalling] = useState(false);

  if (!canPromptInstall && !shouldShowIosHint) return null;

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Install Tronites"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-40 animate-[slideUp_0.35s_ease-out]"
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 16px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>

      <div className="bg-primary-900 text-white rounded-2xl shadow-2xl shadow-black/30 p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-[14px] bg-white/10 border border-white/15 flex items-center justify-center shrink-0 overflow-hidden">
          <img src="/pwa-192.png" alt="" className="w-9 h-9 object-contain" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">
            Add Tronites to your home screen
          </p>
          {shouldShowIosHint ? (
            <p className="text-xs text-white/70 mt-0.5 flex items-center gap-1">
              Tap <FiShare size={12} className="inline shrink-0" /> then
              "Add to Home Screen"
            </p>
          ) : (
            <p className="text-xs text-white/70 mt-0.5">
              Faster loads, offline feed, instant notifications.
            </p>
          )}
        </div>

        {!shouldShowIosHint && (
          <button
            onClick={handleInstall}
            disabled={installing}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-white text-primary-900 text-sm font-semibold hover:bg-white/90 transition disabled:opacity-60"
          >
            {installing ? "…" : "Install"}
          </button>
        )}

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition"
        >
          <FiX size={15} />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
