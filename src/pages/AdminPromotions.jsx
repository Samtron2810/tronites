import { useState, useEffect, useCallback, useRef } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  FiArrowLeft, FiSearch, FiClock, FiCheckCircle, FiAlertCircle,
  FiLoader, FiChevronRight, FiEye, FiMousePointer, FiX,
} from "react-icons/fi";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import { hasPermission } from "../constants/permissions";
import AdminCancelPromotionModal from "../components/AdminCancelPromotionModal";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
];

const STATUS_MAP = {
  active:  { label: "Active",  icon: FiCheckCircle, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "Pending", icon: FiAlertCircle, cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  expired: { label: "Expired", icon: FiClock,       cls: "bg-surface text-ink-muted border-stroke" },
};

const TIER_COLORS = {
  basic:    "text-blue-600 bg-blue-50 border-blue-200",
  standard: "text-violet-600 bg-violet-50 border-violet-200",
  premium:  "text-amber-600 bg-amber-50 border-amber-200",
};

const StatusBadge = ({ status }) => {
  const { label, icon: Icon, cls } = STATUS_MAP[status] || STATUS_MAP.expired;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${cls}`}>
      <Icon size={11} />{label}
    </span>
  );
};

const ExtendPopover = ({ onExtend, onClose }) => {
  const [days, setDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  return (
    <div className="absolute right-0 top-full mt-2 z-20 bg-card border border-stroke rounded-xl shadow-xl p-3 w-56" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs font-semibold text-ink mb-2">Extend by</p>
      <div className="flex items-center gap-2 mb-3">
        <input
          type="number"
          min={1}
          max={30}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-16 px-2 py-1.5 rounded-lg border border-stroke bg-surface text-sm text-ink"
        />
        <span className="text-xs text-ink-muted">day{days === 1 ? "" : "s"} (max 30)</span>
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-1.5 rounded-lg border border-stroke text-xs font-semibold text-ink-sub hover:bg-surface transition">
          Cancel
        </button>
        <button
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            await onExtend(days);
            setSubmitting(false);
          }}
          className="flex-1 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition disabled:opacity-50"
        >
          {submitting ? "…" : "Extend"}
        </button>
      </div>
    </div>
  );
};

const PromotionRow = ({ promo, onCancelClick, onExtend }) => {
  const snippet = promo.text?.trim().slice(0, 100) || (promo.images?.length ? "📷 Image post" : "🎬 Video post");
  const expiry = promo.promotedUntil ? new Date(promo.promotedUntil) : null;
  const tierCls = TIER_COLORS[promo.promotionTier] || "";
  const [showExtend, setShowExtend] = useState(false);

  return (
    <div className="bg-card border border-stroke rounded-2xl p-4 space-y-3">
      {/* Author */}
      {promo.author && (
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span className="font-semibold text-ink">{promo.author.name}</span>
          <span>@{promo.author.username}</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <Link to={`/post/${promo._id}`} className="flex-1 min-w-0 text-sm text-ink leading-snug line-clamp-2 hover:text-primary-600 transition">
          {snippet}
        </Link>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={promo.status} />
          {promo.promotionSource === "admin" ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-primary-600 bg-primary-50 border-primary-200">
              {promo.promotedBy ? `By @${promo.promotedBy.username}` : "Boosted by Tronites"}
            </span>
          ) : (
            promo.promotionTier && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tierCls}`}>
                {promo.promotionTier}
              </span>
            )
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1"><FiEye size={10} />{(promo.impressions ?? 0).toLocaleString()} impressions</span>
        <span className="flex items-center gap-1"><FiMousePointer size={10} />{(promo.clicks ?? 0).toLocaleString()} clicks</span>
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

      <div className="flex gap-2 pt-1 relative">
        <button
          onClick={() => onCancelClick(promo)}
          className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition"
        >
          {promo.status === "pending" ? "Cancel pending" : "End promotion"}
        </button>
        {promo.status === "active" && (
          <>
            <button
              onClick={() => setShowExtend((v) => !v)}
              className="flex-1 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition"
            >
              Extend
            </button>
            {showExtend && (
              <ExtendPopover
                onClose={() => setShowExtend(false)}
                onExtend={async (days) => {
                  await onExtend(promo._id, days);
                  setShowExtend(false);
                }}
              />
            )}
          </>
        )}
        <Link to={`/post/${promo._id}`} className="flex items-center justify-center gap-1 px-3 text-[11px] text-ink-muted hover:text-primary-600 transition">
          View <FiChevronRight size={11} />
        </Link>
      </div>
    </div>
  );
};

const AdminPromotions = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const observerTarget = useRef(null);

  const canManage = hasPermission(user, "manage_content");

  const fetchPromotions = useCallback(async (query, status, pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setIsLoadingMore(true);

      const params = { q: query, status: status || undefined, page: pageNum, limit: 20 };
      const res =
        pageNum === 1
          ? await api.getCached("/posts/promote/admin/all", { params, ttlMs: 60_000 })
          : await api.get("/posts/promote/admin/all", { params });

      if (pageNum === 1) setPromotions(res.data.promotions);
      else setPromotions((prev) => [...prev, ...res.data.promotions]);

      setHasMore(res.data.hasMore);
      setPage(pageNum);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load promotions.");
    } finally {
      if (pageNum === 1) setLoading(false);
      else setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!canManage) return;
    const t = window.setTimeout(() => {
      fetchPromotions(search.trim(), statusFilter, 1);
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, search, statusFilter]);

  useEffect(() => {
    if (!canManage) return;
    const target = observerTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading) {
          fetchPromotions(search.trim(), statusFilter, page + 1);
        }
      },
      { threshold: 0.1 },
    );
    if (target) observer.observe(target);
    return () => { if (target) observer.unobserve(target); };
  }, [canManage, page, hasMore, isLoadingMore, loading, search, statusFilter, fetchPromotions]);

  if (user && !canManage) {
    return <Navigate to="/" replace />;
  }

  const handleExtend = async (postId, days) => {
    try {
      await api.put(`/posts/promote/admin/extend/${postId}`, { days });
      toast.success(`Extended by ${days} day${days === 1 ? "" : "s"}.`);
      api.invalidate("/posts/promote/admin/all");
      await fetchPromotions(search.trim(), statusFilter, 1);
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't extend. Try again.");
    }
  };

  return (
    <MainLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : null}
            className="p-2 rounded-xl text-ink-muted hover:bg-surface hover:text-ink transition"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-ink leading-tight">Promotions</h1>
            <p className="text-sm text-ink-muted">Manage every promoted post across the platform</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-card border border-stroke rounded-xl px-3 py-2.5">
          <FiSearch className="text-ink-muted shrink-0" size={16} />
          <input
            type="text"
            placeholder="Search by post text, name, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-ink-muted hover:text-ink">
              <FiX size={14} />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap transition ${
                statusFilter === tab.value
                  ? "bg-primary-50 border-primary-300 text-primary-600"
                  : "border-stroke text-ink-sub hover:border-primary-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-ink-muted">
            <FiLoader size={24} className="animate-spin text-primary-500" />
            <p className="text-sm">Loading promotions…</p>
          </div>
        ) : promotions.length === 0 ? (
          <div className="bg-card border border-stroke rounded-2xl p-12 text-center space-y-3">
            <span className="text-4xl">⚡</span>
            <p className="font-semibold text-ink">No promotions found</p>
            <p className="text-sm text-ink-muted">Try a different search or filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {promotions.map((p) => (
              <PromotionRow
                key={p._id}
                promo={p}
                onCancelClick={setCancelTarget}
                onExtend={handleExtend}
              />
            ))}
            {hasMore && (
              <div ref={observerTarget} className="py-4 flex justify-center">
                {isLoadingMore && <FiLoader size={18} className="animate-spin text-primary-500" />}
              </div>
            )}
          </div>
        )}
      </div>

      {cancelTarget && (
        <AdminCancelPromotionModal
          postId={cancelTarget._id}
          postText={cancelTarget.text}
          authorName={cancelTarget.author?.name}
          authorUsername={cancelTarget.author?.username}
          wasActive={cancelTarget.status !== "pending"}
          onClose={() => setCancelTarget(null)}
          onCancelled={() => {
            setCancelTarget(null);
            api.invalidate("/posts/promote/admin/all");
            fetchPromotions(search.trim(), statusFilter, 1);
          }}
        />
      )}
    </MainLayout>
  );
};

export default AdminPromotions;
