import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FiArrowLeft, FiZap, FiClock, FiCheckCircle, FiAlertCircle,
  FiRefreshCw, FiLoader, FiChevronRight, FiEye, FiMousePointer,
  FiTrendingUp, FiBarChart2,
} from "react-icons/fi";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import { canPromote } from "../utils/tierLimits";
import { useRefetchOnFocus } from "../hooks/useRefetchOnFocus";

const CACHE_KEY = "/posts/promote/my-promotions";
const TTL_MS = 2 * 60 * 1000;

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

const CTA_LABELS = {
  learn_more: "Learn More",
  shop_now: "Shop Now",
  sign_up: "Sign Up",
  contact_us: "Contact Us",
  download: "Download",
  get_quote: "Get Quote",
  visit_website: "Visit Website",
  book_now: "Book Now",
};

const StatusBadge = ({ status }) => {
  const { label, icon: Icon, cls } = STATUS_MAP[status] || STATUS_MAP.expired;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${cls}`}>
      <Icon size={11} />{label}
    </span>
  );
};

const ReachBar = ({ impressions, impressionCap, reachPct }) => {
  if (impressionCap === null || impressionCap === undefined) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
        <FiEye size={11} />
        <span className="font-medium text-ink">{(impressions ?? 0).toLocaleString()}</span> impressions
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold ml-1">Unlimited</span>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1 text-ink-muted"><FiEye size={11} />Reach</span>
        <span className="font-semibold text-ink">
          {(impressions ?? 0).toLocaleString()} / {impressionCap.toLocaleString()}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
        <div
          className="h-full rounded-full bg-primary-500 transition-all"
          style={{ width: `${reachPct ?? 0}%` }}
        />
      </div>
    </div>
  );
};

const PromotionRow = ({ promo, onResume, onCancel }) => {
  const snippet = promo.text?.trim().slice(0, 100) || (promo.images?.length ? "📷 Image post" : "🎬 Video post");
  const expiry = promo.promotedUntil ? new Date(promo.promotedUntil) : null;
  const tierCls = TIER_COLORS[promo.promotionTier] || "";

  return (
    <div className="bg-card border border-stroke rounded-2xl p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <Link to={`/post/${promo._id}`} className="flex-1 min-w-0 text-sm text-ink leading-snug line-clamp-2 hover:text-primary-600 transition">
          {snippet}
        </Link>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={promo.status} />
          {promo.promotionSource === "admin" ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-primary-600 bg-primary-50 border-primary-200">
              Boosted by Tronites
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

      {/* Reach / impressions bar */}
      {promo.status !== "pending" && (
        <ReachBar
          impressions={promo.impressions}
          impressionCap={promo.impressionCap}
          reachPct={promo.reachPct}
        />
      )}

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1"><FiMousePointer size={10} />{(promo.clicks ?? 0).toLocaleString()} clicks</span>
        {promo.ctaType && (
          <span className="flex items-center gap-1 text-primary-600 font-medium">
            <FiZap size={10} />{(promo.ctaClicks ?? 0).toLocaleString()} CTA clicks
          </span>
        )}
        <span>❤️ {promo.likesCount ?? 0}</span>
        <span>💬 {promo.commentsCount ?? 0}</span>
        <span>🔁 {promo.repostsCount ?? 0}</span>

        {/* CTR */}
        {(promo.impressions ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-primary-600 font-medium">
            <FiTrendingUp size={10} />
            {((promo.clicks / promo.impressions) * 100).toFixed(1)}% CTR
          </span>
        )}

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

      {/* CTA + destination */}
      {promo.ctaType && CTA_LABELS[promo.ctaType] && (
        <div className="flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 border border-primary-100 text-primary-600 font-semibold">
            <FiZap size={10} />{CTA_LABELS[promo.ctaType]}
          </span>
          {promo.destinationUrl && (
            <span className="text-ink-muted truncate max-w-[160px]">{promo.destinationUrl}</span>
          )}
        </div>
      )}

      {/* Targeting info */}
      {promo.promotionTargeting && (promo.promotionTargeting.location || promo.promotionTargeting.interests?.length > 0) && (
        <div className="text-[11px] text-ink-muted flex flex-wrap gap-2">
          {promo.promotionTargeting.location && (
            <span className="bg-surface px-2 py-0.5 rounded-full border border-stroke">
              📍 {promo.promotionTargeting.location}
            </span>
          )}
          {promo.promotionTargeting.interests?.map((i) => (
            <span key={i} className="bg-surface px-2 py-0.5 rounded-full border border-stroke">{i}</span>
          ))}
        </div>
      )}

      {/* Actions for pending */}
      {promo.status === "pending" && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => onCancel(promo._id)} className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition flex items-center justify-center gap-1.5">
            Cancel pending
          </button>
          <button onClick={() => onResume(promo.promotionReference, promo._id)} className="flex-1 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5">
            <FiRefreshCw size={11} />Resume verification
          </button>
        </div>
      )}

      {promo.status !== "pending" && (
        <Link to={`/post/${promo._id}`} className="flex items-center justify-end gap-1 text-[11px] text-ink-muted hover:text-primary-600 transition">
          View post <FiChevronRight size={11} />
        </Link>
      )}
    </div>
  );
};

// ── Summary stats bar ──────────────────────────────────────────────────────

const SummaryBar = ({ promotions }) => {
  const active = promotions.filter((p) => p.status === "active");
  const totalImpressions = promotions.reduce((s, p) => s + (p.impressions ?? 0), 0);
  const totalClicks = promotions.reduce((s, p) => s + (p.clicks ?? 0), 0);
  const totalCtaClicks = promotions.reduce((s, p) => s + (p.ctaClicks ?? 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";
  const hasCta = promotions.some((p) => p.ctaType);

  const stats = [
    { icon: FiZap, label: "Active", value: active.length, sub: "promotions" },
    { icon: FiEye, label: "Impressions", value: totalImpressions.toLocaleString(), sub: "all-time" },
    { icon: FiBarChart2, label: "Avg CTR", value: `${avgCtr}%`, sub: "clicks/impressions" },
  ];
  if (hasCta) {
    stats.push({ icon: FiMousePointer, label: "CTA clicks", value: totalCtaClicks.toLocaleString(), sub: "all-time" });
  }

  return (
    <div className={`grid gap-3 ${hasCta ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
      {stats.map(({ icon: Icon, label, value, sub }) => (
        <div key={label} className="bg-card border border-stroke rounded-2xl p-3 text-center">
          <Icon size={16} className="mx-auto text-primary-500 mb-1" />
          <p className="text-lg font-bold text-ink leading-none">{value}</p>
          <p className="text-[10px] text-ink-muted mt-0.5 font-medium">{label}</p>
          <p className="text-[9px] text-ink-muted">{sub}</p>
        </div>
      ))}
    </div>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────

const MyPromotions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    try {
      const res = await api.getCached(CACHE_KEY, { ttlMs: TTL_MS, revalidate: silent });
      setPromotions(res.data.promotions);
    } catch {
      if (!silent) toast.error("Couldn't load promotions.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; setState happens inside the async load fn, not in this effect body.
  useEffect(() => { load({ silent: false }); }, [load]);
  useRefetchOnFocus(() => load({ silent: true }));

  const handleResume = async (reference, postId) => {
    if (!reference) return;
    setActionId(postId);
    try {
      await api.get(`/posts/promote/verify/${reference}`);
      toast.success("Post promoted! It will now surface to more people.", { duration: 5000 });
      api.invalidate(CACHE_KEY);
      await load({ silent: true });
    } catch (e) {
      toast.error(e.response?.data?.message || "Payment not verified. If you haven't paid, cancel and try again.", { duration: 6000 });
    } finally { setActionId(null); }
  };

  const handleCancel = async (postId) => {
    setActionId(postId);
    try {
      await api.delete(`/posts/promote/cancel/${postId}`);
      toast.success("Pending promotion cleared.");
      api.invalidate(CACHE_KEY);
      await load({ silent: true });
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't cancel. Try again.");
    } finally { setActionId(null); }
  };

  if (!canPromote(user)) {
    return (
      <MainLayout>
        <div className="py-20 text-center space-y-2 text-ink-muted">
          <FiZap size={32} className="mx-auto text-primary-400" />
          <p className="font-semibold text-ink">Creator or Business accounts only</p>
          <p className="text-sm">Promoted posts are available to verified Creator and Business tier accounts.</p>
        </div>
      </MainLayout>
    );
  }

  const active  = promotions.filter((p) => p.status === "active");
  const pending = promotions.filter((p) => p.status === "pending");
  const expired = promotions.filter((p) => p.status === "expired");

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}
            className="p-2 rounded-xl text-ink-muted hover:bg-surface hover:text-ink transition"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-ink leading-tight">My Promotions</h1>
            <p className="text-sm text-ink-muted">Impressions, clicks & ROI across all promoted posts</p>
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
            <SummaryBar promotions={promotions} />

            {pending.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-yellow-600 flex items-center gap-1.5">
                  <FiAlertCircle size={12} />Pending verification ({pending.length})
                </h2>
                {pending.map((p) => (
                  <div key={p._id} className={actionId === p._id ? "opacity-60 pointer-events-none" : ""}>
                    <PromotionRow promo={p} onResume={handleResume} onCancel={handleCancel} />
                  </div>
                ))}
              </section>
            )}

            {active.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
                  <FiCheckCircle size={12} />Active ({active.length})
                </h2>
                {active.map((p) => (
                  <PromotionRow key={p._id} promo={p} onResume={handleResume} onCancel={handleCancel} />
                ))}
              </section>
            )}

            {expired.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-ink-muted flex items-center gap-1.5">
                  <FiClock size={12} />Expired ({expired.length})
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
