import { useState } from "react";
import { FiSlash } from "react-icons/fi";

const BlockUserModal = ({ userName, isBlocked, onConfirm, onCancel }) => {
  const [submitting, setSubmitting] = useState(false);

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
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <FiSlash className="text-red-500" size={16} />
          </div>
          <h2 className="text-base font-semibold text-ink">
            {isBlocked ? "Unblock" : "Block"} {userName}?
          </h2>
        </div>
        <p className="text-sm text-ink-muted leading-relaxed">
          {isBlocked
            ? `${userName} will be able to message you again.`
            : `${userName} won't be able to message you anymore. Your follow status and profile visibility won't change.`}
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stroke text-sm font-medium text-ink-sub hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {submitting ? "..." : isBlocked ? "Unblock" : "Block"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockUserModal;
