import { useEffect, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { subscribeToUpdates, applyUpdate } from "../services/pwaUpdate";

// Deliberately separate from react-hot-toast's Toaster — this one is
// persistent (not auto-dismissing) and has its own action button, which
// doesn't fit react-hot-toast's transient notification model.
const UpdateToast = () => {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    subscribeToUpdates(() => setAvailable(true));
  }, []);

  if (!available) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-card border border-stroke rounded-2xl shadow-xl p-3.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary-600/10 flex items-center justify-center shrink-0">
          <FiRefreshCw className="text-primary-600" size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink leading-tight">
            A new version is ready
          </p>
          <p className="text-xs text-ink-muted mt-0.5">
            Reload to update Tronites.
          </p>
        </div>
        <button
          onClick={applyUpdate}
          className="shrink-0 px-3 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-800 transition"
        >
          Reload
        </button>
      </div>
    </div>
  );
};

export default UpdateToast;
