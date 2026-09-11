import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaHeart,
  FaComment,
  FaRetweet,
  FaBookmark,
  FaUsers,
  FaFileAlt,
  FaFire,
  FaTrophy,
  FaChartLine,
  FaClock,
  FaStar,
} from "react-icons/fa";
import MainLayout from "../layouts/MainLayout";
import { useAuth } from "../context/useAuth";
import api from "../services/api";
import { useRefetchOnFocus } from "../hooks/useRefetchOnFocus";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";

// ─── TTLs (ms) — mirrors backend Redis TTLs so local cache expires at
// roughly the same cadence as the server-side cache. Stale-while-revalidate
// via getCached(revalidate:true) means the UI never blocks on a refetch. ───

const TTL = {
  overview: 5 * 60 * 1000,   // 5 min
  engagement: 3 * 60 * 1000, // 3 min
  topPosts: 3 * 60 * 1000,   // 3 min
  cadence: 3 * 60 * 1000,    // 3 min
  milestone: 5 * 60 * 1000,  // 5 min
  topFans: 10 * 60 * 1000,   // 10 min
  hashtag: 3 * 60 * 1000,    // 3 min
  bestTime: 10 * 60 * 1000,  // 10 min
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const fmt = (n) => {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
};

const deltaLabel = (n) => {
  if (!n) return null;
  return n > 0 ? `+${fmt(n)} this month` : `${fmt(n)} this month`;
};

const pct = (current, next) => {
  if (!next) return 100;
  return Math.min(Math.round((current / next) * 100), 100);
};

// ─── Tiny sparkline (pure SVG, no lib) ──────────────────────────────────────

const Sparkline = ({ data = [], color = "#0f6e56", height = 36 }) => {
  if (!data.length) return null;
  const vals = data.map((d) => d.count);
  const max = Math.max(...vals, 1);
  const w = 120;
  const h = height;
  const pts = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - (v / max) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.replace("#", "")})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ─── Bar chart (pure SVG) ────────────────────────────────────────────────────

const BarChart = ({ data = [], labelKey, valueKey = "count", color = "#0f6e56" }) => {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="flex items-end gap-1 h-20 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-0.5">
          <div
            className="w-full rounded-sm transition-all duration-500"
            style={{
              height: `${Math.max((d[valueKey] / max) * 72, d[valueKey] > 0 ? 3 : 1)}px`,
              backgroundColor: d[valueKey] > 0 ? color : "var(--color-stroke)",
              opacity: d[valueKey] > 0 ? 1 : 0.4,
            }}
          />
          {labelKey && (
            <span className="text-[9px] text-ink-muted leading-none">{d[labelKey]}</span>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Stat card ───────────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, delta, sparkData, color = "#0f6e56", loading }) => (
  <div className="bg-card border border-stroke rounded-2xl p-4 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}18` }}
      >
        <Icon size={14} style={{ color }} />
      </div>
      {sparkData && <div className="w-20 h-8"><Sparkline data={sparkData} color={color} /></div>}
    </div>
    <div>
      {loading ? (
        <div className="h-7 w-16 bg-surface rounded-lg animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-ink tracking-tight">{fmt(value)}</p>
      )}
      <p className="text-xs text-ink-muted mt-0.5">{label}</p>
      {delta !== undefined && delta !== null && !loading && (
        <p className={`text-[11px] font-medium mt-1 ${delta >= 0 ? "text-primary-600" : "text-red-500"}`}>
          {deltaLabel(delta)}
        </p>
      )}
    </div>
  </div>
);

// ─── Day/Range pill selector ─────────────────────────────────────────────────

const RangePicker = ({ value, onChange }) => (
  <div className="flex gap-1 bg-surface rounded-xl p-1">
    {[7, 14, 30].map((d) => (
      <button
        key={d}
        onClick={() => onChange(d)}
        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
          value === d
            ? "bg-primary-600 text-white shadow-sm"
            : "text-ink-muted hover:text-ink"
        }`}
      >
        {d}d
      </button>
    ))}
  </div>
);

// ─── Main ────────────────────────────────────────────────────────────────────

const CreatorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState("likes");
  const [overview, setOverview] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [topPosts, setTopPosts] = useState([]);
  const [cadence, setCadence] = useState(null);
  const [milestone, setMilestone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [engLoading, setEngLoading] = useState(false);
  const [topLoading, setTopLoading] = useState(false);

  // Initial load — overview + milestone (slow-changing, 5 min TTL)
  const fetchStatic = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [ov, ms] = await Promise.all([
        api.getCached("/analytics/overview", { ttlMs: TTL.overview, revalidate: silent }),
        api.getCached("/analytics/follower-milestone", { ttlMs: TTL.milestone, revalidate: silent }),
      ]);
      setOverview(ov.data);
      setMilestone(ms.data);
    } catch {
      // UI shows — placeholders
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Engagement + cadence — keyed by `days`
  const fetchEngagement = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setEngLoading(true);
    try {
      const [eng, cd] = await Promise.all([
        api.getCached("/analytics/engagement", { params: { days }, ttlMs: TTL.engagement, revalidate: silent }),
        api.getCached("/analytics/posting-cadence", { params: { days }, ttlMs: TTL.cadence, revalidate: silent }),
      ]);
      setEngagement(eng.data);
      setCadence(cd.data);
    } catch {
      //
    } finally {
      if (!silent) setEngLoading(false);
    }
  }, [days]);

  // Top posts — keyed by `metric`
  const fetchTopPosts = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setTopLoading(true);
    try {
      const res = await api.getCached("/analytics/top-posts", {
        params: { limit: 5, metric },
        ttlMs: TTL.topPosts,
        revalidate: silent,
      });
      setTopPosts(res.data.posts || []);
    } catch {
      //
    } finally {
      if (!silent) setTopLoading(false);
    }
  }, [metric]);

  // Mount fetches — each call is deferred into an async callback so the
  // setState inside the fetch (loading skeletons) never happens
  // synchronously in the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    void Promise.resolve().then(() => fetchStatic());
  }, [fetchStatic]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchEngagement());
  }, [fetchEngagement]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchTopPosts());
  }, [fetchTopPosts]);

  // Refetch silently on tab focus / visibility — stale-while-revalidate
  // means the UI stays populated while the background fetch runs.
  useRefetchOnFocus(() => {
    fetchStatic({ silent: true });
    fetchEngagement({ silent: true });
    fetchTopPosts({ silent: true });
  });

  const milestoneProgress = milestone ? pct(milestone.count, milestone.nextMilestone) : 0;
  const metricIcon = { likes: FaHeart, comments: FaComment, reposts: FaRetweet, bookmarks: FaBookmark };

  const postSnippet = (post) => {
    if (post.text) return post.text.length > 72 ? post.text.slice(0, 72) + "…" : post.text;
    if (post.images?.length) return "📷 Image post";
    if (post.video?.url) return "🎥 Video post";
    return "Post";
  };

  const postMetricValue = (post) => {
    if (metric === "likes") return post.likesCount ?? 0;
    if (metric === "comments") return post.commentsCount ?? 0;
    if (metric === "reposts") return post.repostsCount ?? 0;
    return post.bookmarksCount ?? 0;
  };

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-surface transition text-ink-muted"
        >
          <FaArrowLeft size={13} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-ink leading-tight">Creator Dashboard</h1>
          <p className="text-xs text-ink-muted">Your audience & content analytics</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <img
            src={resizedImageUrl(user?.profilePic, IMAGE_SIZES.avatarTiny) || defaultAvatar}
            alt={user?.name}
            className="w-8 h-8 rounded-full object-cover border border-stroke"
          />
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#9B59D018", color: "#9B59D0" }}
          >
            Creator
          </span>
        </div>
      </div>

      {/* ── Follower milestone ── */}
      {milestone && (
        <div className="bg-card border border-stroke rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FaTrophy size={14} className="text-amber-500" />
              <span className="text-sm font-semibold text-ink">Follower milestone</span>
            </div>
            <span className="text-sm font-bold text-ink">{fmt(milestone.count)}</span>
          </div>
          {milestone.nextMilestone ? (
            <>
              <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-600 transition-all duration-700"
                  style={{ width: `${milestoneProgress}%` }}
                />
              </div>
              <p className="text-xs text-ink-muted mt-1.5">
                {fmt(milestone.nextMilestone - milestone.count)} more to reach{" "}
                <span className="font-semibold text-ink">{fmt(milestone.nextMilestone)}</span>
              </p>
            </>
          ) : (
            <p className="text-xs text-primary-600 font-semibold mt-1">You've hit every milestone 🎉</p>
          )}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard icon={FaFileAlt} label="Total posts" value={overview?.totals?.posts} delta={overview?.last30d?.posts} loading={loading} color="#0f6e56" />
        <StatCard icon={FaUsers} label="Followers" value={overview?.totals?.followers} delta={overview?.last30d?.followers} sparkData={engagement?.followers} loading={loading} color="#6366f1" />
        <StatCard icon={FaHeart} label="Total likes" value={overview?.totals?.likes} delta={overview?.last30d?.likes} sparkData={engagement?.likes} loading={loading} color="#ef4444" />
        <StatCard icon={FaComment} label="Total comments" value={overview?.totals?.comments} delta={overview?.last30d?.comments} sparkData={engagement?.comments} loading={loading} color="#f59e0b" />
        <StatCard icon={FaRetweet} label="Total reposts" value={overview?.totals?.reposts} delta={overview?.last30d?.reposts} sparkData={engagement?.reposts} loading={loading} color="#0f6e56" />
        <StatCard icon={FaBookmark} label="Saves" value={overview?.totals?.bookmarks} loading={loading} color="#8b5cf6" />
      </div>

      {/* ── Engagement chart ── */}
      <div className="bg-card border border-stroke rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FaChartLine size={13} className="text-primary-600" />
            <span className="text-sm font-semibold text-ink">Engagement trend</span>
          </div>
          <RangePicker value={days} onChange={setDays} />
        </div>

        {engLoading ? (
          <div className="h-24 bg-surface rounded-xl animate-pulse" />
        ) : engagement ? (
          <div className="space-y-3">
            {[
              { key: "likes", label: "Likes", color: "#ef4444" },
              { key: "comments", label: "Comments", color: "#f59e0b" },
              { key: "reposts", label: "Reposts", color: "#0f6e56" },
            ].map(({ key, label, color }) => {
              const total = (engagement[key] || []).reduce((s, d) => s + d.count, 0);
              return (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-ink-muted">{label}</span>
                    <span className="text-xs font-bold text-ink">{fmt(total)}</span>
                  </div>
                  <Sparkline data={engagement[key]} color={color} height={32} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-ink-muted text-center py-6">No engagement data yet</p>
        )}
      </div>

      {/* ── Top posts ── */}
      <div className="bg-card border border-stroke rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FaFire size={13} className="text-orange-500" />
            <span className="text-sm font-semibold text-ink">Top posts</span>
          </div>
          <div className="flex gap-1 bg-surface rounded-xl p-1">
            {["likes", "comments", "reposts", "bookmarks"].map((m) => {
              const MetricIcon = metricIcon[m];
              return (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  title={m}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    metric === m
                      ? "bg-primary-600 text-white shadow-sm"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <MetricIcon size={11} />
                </button>
              );
            })}
          </div>
        </div>

        {topLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-surface rounded-xl animate-pulse" />
            ))}
          </div>
        ) : topPosts.length ? (
          <div className="space-y-1">
            {topPosts.map((post, i) => (
              <Link
                key={post._id}
                to={`/post/${post._id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface transition group"
              >
                <span className="text-xs font-bold text-ink-muted w-4 shrink-0">{i + 1}</span>
                <p className="text-sm text-ink flex-1 min-w-0 truncate group-hover:text-primary-600 transition">
                  {postSnippet(post)}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  {React.createElement(metricIcon[metric], { size: 10, className: "text-ink-muted" })}
                  <span className="text-xs font-bold text-ink">{fmt(postMetricValue(post))}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-muted text-center py-6">No posts yet</p>
        )}
      </div>

      {/* ── Posting cadence ── */}
      {cadence && (
        <div className="bg-card border border-stroke rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <FaClock size={13} className="text-primary-600" />
            <span className="text-sm font-semibold text-ink">Posting cadence</span>
            <span className="ml-auto text-xs text-ink-muted">{days}d window</span>
          </div>

          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
            By day of week
          </p>
          <BarChart
            data={cadence.byDow.map((d) => ({ ...d, label: DOW_LABELS[d.dow] }))}
            labelKey="label"
            color="#0f6e56"
          />

          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mt-4 mb-2">
            By hour (UTC)
          </p>
          <BarChart data={cadence.byHour} color="#6366f1" />
          <p className="text-[10px] text-ink-muted mt-1">
            Tallest bars = when you post most — align with your audience's active hours.
          </p>
        </div>
      )}

      {/* ── Best posting time tip ── */}
      {cadence && (() => {
        const bestDow = [...cadence.byDow].sort((a, b) => b.count - a.count)[0];
        const bestHour = [...cadence.byHour].sort((a, b) => b.count - a.count)[0];
        if (!bestDow?.count && !bestHour?.count) return null;
        return (
          <div
            className="rounded-2xl p-4 mb-4 flex gap-3"
            style={{ backgroundColor: "#9B59D010", border: "1px solid #9B59D030" }}
          >
            <FaStar size={14} className="shrink-0 mt-0.5" style={{ color: "#9B59D0" }} />
            <div>
              <p className="text-sm font-semibold text-ink">Your peak posting time</p>
              <p className="text-xs text-ink-muted mt-0.5">
                You post most on{" "}
                <span className="font-semibold text-ink">{DOW_LABELS[bestDow.dow]}s</span>
                {bestHour?.count > 0 && (
                  <>
                    {" "}around{" "}
                    <span className="font-semibold text-ink">{bestHour.hour}:00 UTC</span>
                  </>
                )}
                . Keep it consistent — audiences follow patterns.
              </p>
            </div>
          </div>
        );
      })()}

      {/* ── Sub-cards (each manages its own cache slice) ── */}
      <BestTimeCard />
      <TopFansCard />
      <HashtagPerformanceCard days={days} />
    </MainLayout>
  );
};

// ─── Sub-cards fetched independently ────────────────────────────────────────

const BestTimeCard = () => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const fetch = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const r = await api.getCached("/analytics/best-time-to-post", {
        ttlMs: TTL.bestTime,
        revalidate: silent,
      });
      setData(r.data);
    } catch {
      //
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => fetch());
  }, [fetch]);
  useRefetchOnFocus(() => fetch({ silent: true }));

  if (loading) return <div className="h-20 bg-card border border-stroke rounded-2xl animate-pulse mb-4" />;
  if (!data?.recommendation) return null;

  return (
    <div className="bg-card border border-stroke rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <FaClock size={13} className="text-indigo-500" />
        <span className="text-sm font-semibold text-ink">Best time to post</span>
      </div>
      <p className="text-2xl font-bold text-ink">{data.recommendation.label}</p>
      <p className="text-xs text-ink-muted mt-1">{data.reason}</p>
      <p className="text-xs font-medium text-primary-600 mt-1">
        Avg {fmt(data.recommendation.avgEngagement)} engagements when you post at this hour
      </p>
    </div>
  );
};

const TopFansCard = () => {
  const [fans, setFans] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const fetch = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const r = await api.getCached("/analytics/top-fans", {
        params: { limit: 5 },
        ttlMs: TTL.topFans,
        revalidate: silent,
      });
      setFans(r.data.fans || []);
    } catch {
      //
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => fetch());
  }, [fetch]);
  useRefetchOnFocus(() => fetch({ silent: true }));

  if (loading) return <div className="h-40 bg-card border border-stroke rounded-2xl animate-pulse mb-4" />;
  if (!fans.length) return null;

  return (
    <div className="bg-card border border-stroke rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <FaUsers size={13} className="text-primary-600" />
        <span className="text-sm font-semibold text-ink">Top fans this month</span>
      </div>
      <div className="space-y-2">
        {fans.map(({ user: u, score }, i) => (
          <Link
            key={u._id}
            to={`/profile/${u._id}`}
            className="flex items-center gap-3 hover:bg-surface rounded-xl px-2 py-1.5 transition"
          >
            <span className="text-xs font-bold text-ink-muted w-4">{i + 1}</span>
            <img
              src={resizedImageUrl(u.profilePic, IMAGE_SIZES.avatarSmall) || defaultAvatar}
              alt={u.name}
              className="w-8 h-8 rounded-full object-cover border border-stroke shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{u.name}</p>
              <p className="text-xs text-ink-muted">@{u.username}</p>
            </div>
            <span className="text-xs font-bold text-primary-600">{fmt(score)} pts</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

const HashtagPerformanceCard = ({ days }) => {
  const [tags, setTags] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const fetch = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const r = await api.getCached("/analytics/hashtag-performance", {
        params: { days },
        ttlMs: TTL.hashtag,
        revalidate: silent,
      });
      setTags(r.data.hashtags || []);
    } catch {
      //
    } finally {
      if (!silent) setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void Promise.resolve().then(() => fetch());
  }, [fetch]);
  useRefetchOnFocus(() => fetch({ silent: true }));

  if (loading) return <div className="h-32 bg-card border border-stroke rounded-2xl animate-pulse mb-4" />;
  if (!tags.length) return null;

  const maxEng = Math.max(...tags.map((t) => t.avgEngagement), 1);

  return (
    <div className="bg-card border border-stroke rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm" style={{ color: "#0f6e56" }}>#</span>
        <span className="text-sm font-semibold text-ink">Hashtag performance</span>
        <span className="ml-auto text-xs text-ink-muted">{days}d · avg engagement</span>
      </div>
      <div className="space-y-2">
        {tags.slice(0, 8).map((t) => (
          <div key={t.tag} className="flex items-center gap-2">
            <span className="text-xs font-medium text-primary-600 w-24 truncate shrink-0">
              #{t.tag}
            </span>
            <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-600 transition-all duration-500"
                style={{ width: `${(t.avgEngagement / maxEng) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-ink w-8 text-right shrink-0">
              {fmt(t.avgEngagement)}
            </span>
            <span className="text-[10px] text-ink-muted w-10 text-right shrink-0">
              ×{t.uses}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-ink-muted mt-2">
        Avg engagements per post · × = times used in window
      </p>
    </div>
  );
};

export default CreatorDashboard;
