import { useState } from "react";
import { FiX, FiAlertTriangle, FiLoader, FiShield } from "react-icons/fi";
import api from "../services/api";
import toast from "react-hot-toast";

// Moderator/admin force-cancel of a promotion — active or pending, any
// owner. Self-contained like AdminPromotePostModal: owns its own API call,
// tells the caller the result via onCancelled so PostCard/PostDetailModal
// can flip isCurrentlyPromoted locally without a refetch.
const AdminCancelPromotionModal = ({
  postId,
  postText,
  authorName,
  authorUsername,
  wasActive = true,
  onClose,
  onCancelled,
}) => {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.delete(`/posts/promote/admin/cancel/${postId}`);
      toast.success(
        res.data.wasActive ? "Promotion ended." : "Pending promotion cancelled.",
      );
      onCancelled?.();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Couldn't cancel promotion. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-stroke rounded-2xl w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stroke">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-50 text-red-600">
              <FiAlertTriangle size={16} />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">
                {wasActive ? "End promotion" : "Cancel pending promotion"}
              </h2>
              <p className="text-[11px] text-ink-muted">Moderator action</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-muted hover:bg-surface hover:text-ink transition">
            <FiX size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {(authorName || authorUsername) && (
            <p className="text-xs text-ink-muted">
              For <span className="font-semibold text-ink">{authorName}</span>
              {authorUsername && <span> @{authorUsername}</span>}
            </p>
          )}
          {postText && (
            <div className="rounded-xl bg-surface border border-stroke px-3 py-2.5">
              <p className="text-sm text-ink-sub line-clamp-2 leading-relaxed">{postText}</p>
            </div>
          )}
          <p className="text-[11px] text-ink-muted flex items-start gap-1.5">
            <FiShield size={12} className="mt-0.5 shrink-0 text-red-500" />
            {wasActive
              ? "This ends the promotion immediately. The creator is notified, and this is recorded in the moderation audit log."
              : "This clears the pending promotion so the creator can retry. The creator is notified."}
          </p>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-stroke text-sm font-semibold text-ink-sub hover:bg-surface transition">
            Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting
              ? <><FiLoader size={13} className="animate-spin" />Cancelling…</>
              : <>{wasActive ? "End promotion" : "Cancel promotion"}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminCancelPromotionModal;
