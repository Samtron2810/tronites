import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FaUsers,
  FaHeart,
  FaChartBar,
  FaStar,
  FaHandshake,
  FaLocationPin,
  FaEnvelope,
  FaSpinner,
  FaFire,
  FaArrowLeft,
} from "react-icons/fa6";
import VerifiedBadge from "../components/VerifiedBadge";
import ShareMenu from "../components/ShareMenu";
import api from "../services/api";
import { useAuth } from "../context/useAuth";

// ─── Metric block ─────────────────────────────────────────────────────────
const Metric = ({ value, label, icon: Icon, className = "" }) => (
  <div className={`flex flex-col items-center text-center ${className}`}>
    <div className="flex items-center gap-1 text-ink">
      {Icon && <Icon size={13} className="text-ink-muted" />}
      <span className="text-2xl font-extrabold tracking-tight leading-none">
        {value}
      </span>
    </div>
    <span className="text-xs text-ink-muted mt-1 leading-snug">{label}</span>
  </div>
);

const fmtNum = (n) => {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

// ─── MediaKit page ────────────────────────────────────────────────────────
const MediaKit = () => {
  const { creatorId } = useParams();
  const { user: currentUser } = useAuth();
  const [kit, setKit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.getCached(
          `/creator-monetization/media-kit/${creatorId}`,
          { ttlMs: 60_000 },
        );
        setKit(data.mediaKit);
      } catch (e) {
        setError(e.response?.data?.message || "Could not load media kit.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [creatorId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FaSpinner size={22} className="animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <p className="text-ink-muted text-sm">{error}</p>
      </div>
    );
  }

  const {
    creator,
    reach,
    engagement,
    subscriptionPlan,
    topPosts,
    generatedAt,
  } = kit;

  // Check if viewing own profile
  const isOwnProfile = currentUser?._id === creatorId;

  const engagementColor =
    engagement.engagementRatePct >= 5
      ? "text-green-600"
      : engagement.engagementRatePct >= 2
        ? "text-amber-600"
        : "text-ink";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* header row: back + share */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition"
        >
          <FaArrowLeft size={11} />
          Previous page
        </button>
        <ShareMenu
          url={`${window.location.origin}/media-kit/${creatorId}`}
          title={`${creator.name}'s media kit`}
          text={`Check out @${creator.username}'s media kit on Tronites`}
        />
      </div>

      {/* Creator hero */}
      <div className="bg-card border border-stroke rounded-3xl overflow-hidden">
        {/* Accent top bar */}
        <div className="h-1.5 w-full bg-linear-to-r from-primary-400 via-primary-600 to-primary-400" />
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-start gap-4">
            {creator.profilePic ? (
              <img
                src={creator.profilePic}
                alt={creator.name}
                className="w-16 h-16 rounded-2xl object-cover shrink-0 border-2 border-stroke"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center shrink-0 text-primary-600 text-2xl font-bold">
                {creator.name?.[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xl font-extrabold text-ink leading-none">
                  {creator.name}
                </h1>
                {creator.isVerified && (
                  <VerifiedBadge
                    verifications={[{ type: "creator" }]}
                    size={16}
                  />
                )}
              </div>
              <p className="text-sm text-ink-muted mt-0.5">
                @{creator.username}
              </p>
              {creator.location && (
                <p className="text-xs text-ink-muted mt-1 flex items-center gap-1">
                  <FaLocationPin size={10} /> {creator.location}
                </p>
              )}
            </div>
            {creator.openToCollabs && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-600 text-xs font-semibold border border-primary-200 dark:border-primary-800 shrink-0">
                <FaHandshake size={10} />
                Open to collabs
              </span>
            )}
          </div>

          {creator.bio && (
            <p className="text-sm text-ink-muted mt-4 leading-relaxed">
              {creator.bio}
            </p>
          )}

          {creator.interests?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {creator.interests.map((i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-surface border border-stroke rounded-full text-xs text-ink-muted"
                >
                  {i}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reach metrics */}
      <div className="bg-card border border-stroke rounded-2xl px-6 py-5">
        <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-4">
          Reach
        </h2>
        <div className="grid grid-cols-3 gap-4 divide-x divide-stroke">
          <Metric
            value={fmtNum(reach.followers)}
            label="Followers"
            icon={FaUsers}
          />
          <Metric
            value={fmtNum(reach.totalPosts)}
            label="Posts"
            icon={FaChartBar}
            className="pl-4"
          />
          <Metric
            value={fmtNum(reach.activeSubscribers)}
            label="Subscribers"
            icon={FaStar}
            className="pl-4"
          />
        </div>
        <div className="grid grid-cols-3 gap-4 divide-x divide-stroke mt-4 pt-4 border-t border-stroke">
          <Metric
            value={fmtNum(reach.totalLikes)}
            label="Total likes"
            icon={FaHeart}
          />
          <Metric
            value={fmtNum(reach.totalReposts)}
            label="Reposts"
            className="pl-4"
          />
          <Metric
            value={fmtNum(reach.totalComments)}
            label="Comments"
            className="pl-4"
          />
        </div>
      </div>

      {/* Engagement */}
      <div className="bg-card border border-stroke rounded-2xl px-6 py-5">
        <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-4">
          Engagement
        </h2>
        <div className="grid grid-cols-3 gap-4 divide-x divide-stroke">
          <div className="text-center">
            <p
              className={`text-2xl font-extrabold leading-none ${engagementColor}`}
            >
              {engagement.engagementRatePct}%
            </p>
            <p className="text-xs text-ink-muted mt-1">Engagement rate</p>
          </div>
          <Metric
            value={fmtNum(engagement.avgLikesPerPost)}
            label="Avg likes/post"
            icon={FaHeart}
            className="pl-4"
          />
          <Metric
            value={fmtNum(engagement.avgCommentsPerPost)}
            label="Avg comments/post"
            className="pl-4"
          />
        </div>
        {engagement.engagementRatePct >= 3 && (
          <div className="mt-4 flex items-center gap-1.5 text-xs text-green-600 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 px-3 py-2 rounded-xl">
            <FaFire size={11} />
            Above-average engagement for this follower count
          </div>
        )}
      </div>

      {/* Subscription plan */}
      {subscriptionPlan && (
        <div className="bg-card border border-stroke rounded-2xl px-6 py-5">
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-3">
            Subscription
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink text-sm">
                {subscriptionPlan.name}
              </p>
              {subscriptionPlan.perks && (
                <p className="text-xs text-ink-muted mt-1">
                  {subscriptionPlan.perks}
                </p>
              )}
            </div>
            <p className="text-xl font-extrabold text-ink">
              ₦{subscriptionPlan.priceNgn?.toLocaleString()}
              <span className="text-xs text-ink-muted font-normal">/mo</span>
            </p>
          </div>
        </div>
      )}

      {/* Top posts */}
      {topPosts?.length > 0 && (
        <div className="bg-card border border-stroke rounded-2xl px-6 py-5 space-y-3">
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-widest">
            Top posts (last 30 days)
          </h2>
          {topPosts.map((p, i) => (
            <div
              key={p._id}
              className="flex items-start gap-3 py-3 border-b border-stroke last:border-0"
            >
              <span className="text-xs font-bold text-ink-muted w-4 shrink-0 pt-0.5">
                #{i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink line-clamp-2">
                  {p.text || "(Image post)"}
                </p>
                <div className="flex items-center gap-4 mt-1.5">
                  <span className="text-xs text-ink-muted flex items-center gap-1">
                    <FaHeart size={10} /> {fmtNum(p.likesCount)}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {fmtNum(p.commentsCount)} comments
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contact CTA */}
      {creator.openToCollabs && !isOwnProfile && (
        <div className="bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800 rounded-2xl px-6 py-5 text-center space-y-3">
          <FaHandshake size={24} className="text-primary-600 mx-auto" />
          <p className="text-sm font-semibold text-ink">
            Interested in a collaboration?
          </p>
          <p className="text-xs text-ink-muted">
            Reach out to @{creator.username} directly on Tronites.
          </p>
          <Link
            to={`/chat?user=${creatorId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition"
          >
            <FaEnvelope size={11} />
            Send a message
          </Link>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-ink-muted pb-4">
        Generated by Tronites · {new Date(generatedAt).toLocaleDateString()}
      </p>
    </div>
  );
};

export default MediaKit;
