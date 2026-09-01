import { useState } from "react";
import { FiSlash } from "react-icons/fi";
import useBackButtonClose from "../hooks/useBackButtonClose";

const BlockUserModal = ({ userName, isBlocked, onConfirm, onCancel }) => {
  const [submitting, setSubmitting] = useState(false);

  // Mobile back button closes the modal; UI closes consume the pushed
  // history entry so history stays balanced (see the hook).
  useBackButtonClose(true, onCancel);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <FiSlash className="text-red-500" size={16} />
          </div>
          <h2 className="text-lg font-semibold text-ink">
            {isBlocked ? "Unblock" : "Block"} {userName}?
          </h2>
        </div>
        <p className="text-base text-ink-muted leading-relaxed">
          {isBlocked
            ? `${userName} will be able to follow, message, and see your profile again.`
            : `${userName} won't be able to message you, see your profile, or follow you. Any existing follow between you will end.`}
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stroke text-base font-medium text-ink-sub hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl text-base font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {submitting ? "..." : isBlocked ? "Unblock" : "Block"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockUserModal;
