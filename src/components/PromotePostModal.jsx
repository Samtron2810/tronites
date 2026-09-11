import { useState, useEffect } from "react";
import {
  FiX,
  FiZap,
  FiExternalLink,
  FiLoader,
  FiAlertTriangle,
  FiTrash2,
  FiRefreshCw,
} from "react-icons/fi";
import api from "../services/api";
import toast from "react-hot-toast";

// `promotionReference` — non-null when the post has a pending (unpaid or
// failed) Paystack session. The user can RESUME (re-attempt verify) if they
// already paid but lost connection, or CANCEL to start fresh.
const PromotePostModal = ({ postId, postText, promotionReference, onClose }) => {
  const [fees, setFees] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resuming, setResuming] = useState(false);
  // Track pending state locally so cancel clears it without a parent refetch.
  const [hasPending, setHasPending] = useState(Boolean(promotionReference));
  const [pendingRef, setPendingRef] = useState(promotionReference || null);

  useEffect(() => {
    if (hasPending) {
      void Promise.resolve().then(() => setLoading(false));
      return;
    }
    api
      .get("/posts/promote/fees")
      .then((r) => setFees(r.data))
      .catch(() => toast.error("Couldn't load promotion info."))
      .finally(() => setLoading(false));
  }, [hasPending]);

  // Resume: call verify with the existing reference — if the payment went
  // through, this activates the promotion. If not, it returns a 402 and
  // the user can cancel to start fresh.
  const handleResume = async () => {
    if (resuming || !pendingRef) return;
    setResuming(true);
    try {
      await api.get(`/posts/promote/verify/${pendingRef}`);
      toast.success("Post promoted! It will now surface to more people.", {
        duration: 5000,
      });
      onClose();
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        "Payment not verified. If you haven't paid yet, cancel below and try again.";
      toast.error(msg, { duration: 6000 });
    } finally {
      setResuming(false);
    }
  };

  const handleCancelPending = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      await api.delete(`/posts/promote/cancel/${postId}`);
      setHasPending(false);
      setPendingRef(null);
      setLoading(true);
      api
        .get("/posts/promote/fees")
        .then((r) => setFees(r.data))
        .catch(() => toast.error("Couldn't load promotion info."))
        .finally(() => setLoading(false));
      toast.success("Pending promotion cleared. You can now start a new one.");
    } catch (e) {
      toast.error(
        e.response?.data?.message || "Couldn't cancel promotion. Try again.",
      );
    } finally {
      setCancelling(false);
    }
  };

  const handlePromote = async () => {
    if (initiating) return;
    setInitiating(true);
    try {
      const res = await api.post("/posts/promote/initiate", { postId });
      window.location.href = res.data.authorizationUrl;
    } catch (e) {
      toast.error(
        e.response?.data?.message || "Couldn't start promotion. Try again.",
      );
      setInitiating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-stroke rounded-2xl w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stroke">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary-50 text-primary-600">
              <FiZap size={16} />
            </span>
            <h2 className="text-base font-bold text-ink">Promote post</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:bg-surface hover:text-ink transition"
          >
            <FiX size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Post preview snippet */}
          {postText && (
            <div className="rounded-xl bg-surface border border-stroke px-3 py-2.5">
              <p className="text-sm text-ink-sub line-clamp-2 leading-relaxed">
                {postText}
              </p>
            </div>
          )}

          {/* Pending payment state */}
          {hasPending ? (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 space-y-2">
              <div className="flex items-start gap-2">
                <FiAlertTriangle size={14} className="text-yellow-600 mt-0.5 shrink-0" />
                <p className="text-sm text-yellow-800 font-medium leading-snug">
                  A payment for this post is pending verification.
                </p>
              </div>
              <p className="text-xs text-yellow-700 leading-relaxed">
                If you already paid, tap <strong>Resume</strong> to complete
                activation. If the payment failed or you changed your mind,
                tap <strong>Cancel pending</strong> to start fresh.
              </p>
            </div>
          ) : (
            /* What you get */
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">
                What you get
              </p>
              {[
                "Post surfaces in feeds of non-followers",
                "Runs for the full promotion period",
                "Charged once via Paystack",
              ].map((line) => (
                <div key={line} className="flex items-start gap-2">
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 text-[10px] font-bold">
                    ✓
                  </span>
                  <p className="text-sm text-ink-sub">{line}</p>
                </div>
              ))}
            </div>
          )}

          {/* Price — only show when not pending */}
          {!hasPending &&
            (loading ? (
              <div className="flex items-center gap-2 text-ink-muted text-sm">
                <FiLoader size={14} className="animate-spin" />
                Loading price...
              </div>
            ) : fees ? (
              <div className="rounded-xl border border-stroke bg-surface px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-ink-sub">
                  {fees.promoDays}-day promotion
                </span>
                <span className="text-base font-bold text-ink">
                  ₦{fees.amountNgn?.toLocaleString()}
                </span>
              </div>
            ) : null)}

          {!hasPending && (
            <p className="text-[11px] text-ink-muted">
              You'll be redirected to Paystack to complete payment. Promotion
              activates immediately after successful charge.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          {hasPending ? (
            <>
              <button
                onClick={handleCancelPending}
                disabled={cancelling || resuming}
                className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <FiLoader size={13} className="animate-spin" />
                    Cancelling…
                  </>
                ) : (
                  <>
                    <FiTrash2 size={13} />
                    Cancel pending
                  </>
                )}
              </button>
              <button
                onClick={handleResume}
                disabled={resuming || cancelling}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resuming ? (
                  <>
                    <FiLoader size={13} className="animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <FiRefreshCw size={13} />
                    Resume
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-stroke text-sm font-semibold text-ink-sub hover:bg-surface transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePromote}
                disabled={initiating || loading || !fees}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {initiating ? (
                  <>
                    <FiLoader size={13} className="animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  <>
                    <FiExternalLink size={13} />
                    Pay & Promote
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromotePostModal;
