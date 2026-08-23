import { useState } from "react";
import { FiAlertTriangle } from "react-icons/fi";

const DeletePostModal = ({ onConfirm, onCancel }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try { await onConfirm(); }
    finally { setIsDeleting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <FiAlertTriangle className="text-red-500" size={16} />
          </div>
          <h2 className="text-base font-semibold text-ink">Delete Post</h2>
        </div>
        <p className="text-sm text-ink-muted leading-relaxed">
          Are you sure you want to delete this post? This action cannot be undone.
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stroke text-sm font-medium text-ink-sub hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeletePostModal;
