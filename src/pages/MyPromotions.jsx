import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiZap,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiLoader,
  FiChevronRight,
} from "react-icons/fi";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import { canPromote } from "../utils/tierLimits";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_MAP = {
  active: {
    label: "Active",
    icon: FiCheckCircle,
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  pending: {
    label: "Pending",
    icon: FiAlertCircle,
    cls: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  expired: {
    label: "Expired",
    icon: FiClock,
    cls: "bg-surface text-ink-muted border-stroke",
  },
};

const StatusBadge = ({ status }) => {
  const { label, icon: Icon, cls } = STATUS_MAP[status] || STATUS_MAP.expired;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${cls}`}
    >
      <Icon size={11} />
      {label}
    </span>
  );
};

// ─── Single promotion row ─────────────────────────────────────────────────────

const PromotionRow = ({ promo, onResume, onCancel }) => {
  const snippet = promo.text?.trim().slice(0, 100) || (promo.images?.length ? "📷 Image post" : "🎬 Video post");
  const hasExpiry = promo.promotedUntil;
  const expiry = hasExpiry ? new Date(promo.promotedUntil) : null;
  const now = new Date();

  return (
    <div className="bg-card border border-stroke rounded-2xl p-4 space-y-3">
      {/* Top row: snippet + status */}
      <div className="flex items-start justify-between gap-3">
        <Link
          to={`/post/${promo._id}`}
          className="flex-1 min-w-0 text-sm text-ink leading-snug line-clamp-2 hover:text-primary-600 transition"
        >
          {snippet}
        </Link>
        <StatusBadge status={promo.status} />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-muted">
        <span>❤️ {promo.likesCount ?? 0}</span>
        <span>💬 {promo.commentsCount ?? 0}</span>
        <span>🔁 {promo.repostsCount ?? 0}</span>
        {promo.status === "active" && expiry && (
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <FiClock size={10} />
            Expires {expiry.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
        )}
        {promo.status === "expired" && expiry && (
          <span className="flex items-center gap-1">
            <FiClock size={10} />
            Ended {expiry.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
        )}
        {promo.status === "pending" && (
          <span className="text-yellow-600 font-medium">Payment awaiting verification</span>
        )}
      </div>

      {/* Actions for pending */}
      {promo.status === "pending" && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onCancel(promo._id)}
            className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition flex items-center justify-center gap-1.5"
          >
            Cancel pending
          </button>
          <button
            onClick={() => onResume(promo.promotionReference, promo._id)}
            className="flex-1 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <FiRefreshCw size={11} />
            Resume verification
          </button>
        </div>
      )}

      {/* View post link for non-pending */}
      {promo.status !== "pending" && (
        <Link
          to={`/post/${promo._id}`}
          className="flex items-center justify-end gap-1 text-[11px] text-ink-muted hover:text-primary-600 transition"
        >
          View post <FiChevronRight size={11} />
        </Link>
      )}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const MyPromotions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null); // postId being acted on

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/posts/promote/my-promotions");
      setPromotions(res.data.promotions);
    } catch {
      toast.error("Couldn't load promotions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleResume = async (reference, postId) => {
    if (!reference) return;
    setActionId(postId);
    try {
      await api.get(`/posts/promote/verify/${reference}`);
      toast.success("Post promoted! It will now surface to more people.", { duration: 5000 });
      await load();
    } catch (e) {
      toast.error(
        e.response?.data?.message ||
          "Payment not verified. If you haven't paid, cancel and try again.",
        { duration: 6000 }
      );
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (postId) => {
    setActionId(postId);
    try {
      await api.delete(`/posts/promote/cancel/${postId}`);
      toast.success("Pending promotion cleared.");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't cancel. Try again.");
    } finally {
      setActionId(null);
    }
  };

  if (!canPromote(user)) {
    return (
      <MainLayout>
        <div className="py-20 text-center space-y-2 text-ink-muted">
          <FiZap size={32} className="mx-auto text-primary-400" />
          <p className="font-semibold text-ink">Business accounts only</p>
          <p className="text-sm">Promoted posts are available to verified Business tier accounts.</p>
        </div>
      </MainLayout>
    );
  }

  // Group by status for display
  const active = promotions.filter((p) => p.status === "active");
  const pending = promotions.filter((p) => p.status === "pending");
  const expired = promotions.filter((p) => p.status === "expired");

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            className="p-2 rounded-xl text-ink-muted hover:bg-surface hover:text-ink transition"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-ink leading-tight">My Promotions</h1>
            <p className="text-sm text-ink-muted">All posts you've promoted or started promoting</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-ink-muted">
            <FiLoader size={24} className="animate-spin text-primary-500" />
            <p className="text-sm">Loading promotions…</p>
          </div>
        ) : promotions.length === 0 ? (
          <div className="bg-card border border-stroke rounded-2xl p-12 text-center space-y-3">
            <span className="text-4xl">⚡</span>
            <p className="font-semibold text-ink">No promotions yet</p>
            <p className="text-sm text-ink-muted">
              Open any of your posts, tap ···, and choose <strong>Promote post</strong> to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending — most urgent, show first */}
            {pending.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-yellow-600 flex items-center gap-1.5">
                  <FiAlertCircle size={12} />
                  Pending verification ({pending.length})
                </h2>
                {pending.map((p) => (
                  <div key={p._id} className={actionId === p._id ? "opacity-60 pointer-events-none" : ""}>
                    <PromotionRow promo={p} onResume={handleResume} onCancel={handleCancel} />
                  </div>
                ))}
              </section>
            )}

            {/* Active */}
            {active.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
                  <FiCheckCircle size={12} />
                  Active ({active.length})
                </h2>
                {active.map((p) => (
                  <PromotionRow key={p._id} promo={p} onResume={handleResume} onCancel={handleCancel} />
                ))}
              </section>
            )}

            {/* Expired */}
            {expired.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-ink-muted flex items-center gap-1.5">
                  <FiClock size={12} />
                  Expired ({expired.length})
                </h2>
                {expired.map((p) => (
                  <PromotionRow key={p._id} promo={p} onResume={handleResume} onCancel={handleCancel} />
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MyPromotions;
