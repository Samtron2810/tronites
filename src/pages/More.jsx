import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import {
  FaChartBar,
  FaBullhorn,
  FaQuestionCircle,
  FaShieldAlt,
  FaFileContract,
  FaRegBookmark,
  FaChevronRight,
  FaArrowLeft,
  FaLock,
  FaCalendarAlt,
  FaThumbtack,
  FaHandshake,
  FaAward,
} from "react-icons/fa";
import { useAuth } from "../context/useAuth";
import api from "../services/api";
import toast from "react-hot-toast";
import { isCreator } from "../utils/creator";
import { canSchedule, isVerified, canPromote } from "../utils/tierLimits";

// Menu tile used throughout the More page — declared at module scope so it
// isn't re-created on each render (react-hooks/static-components).
const Tile = ({ tile }) => {
  const Icon = tile.icon;
  const isDisabled = tile.comingSoon || tile.locked;

  const content = (
    <div className="flex items-center gap-4 px-5 py-4">
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
          isDisabled
            ? "bg-surface text-ink-muted"
            : "bg-primary-50 text-primary-600"
        }`}
      >
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-base font-semibold flex items-center gap-2 ${
            isDisabled ? "text-ink-muted" : "text-ink"
          }`}
        >
          {tile.label}
          {tile.comingSoon && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-ink-muted bg-surface px-1.5 py-0.5 rounded">
              Coming soon
            </span>
          )}
          {tile.badge > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-600 text-white">
              {tile.badge}
            </span>
          )}
        </p>
        <p className="text-sm text-ink-muted mt-0.5 truncate">
          {tile.description}
        </p>
      </div>
      {!isDisabled && (
        <FaChevronRight size={12} className="text-ink-muted shrink-0" />
      )}
    </div>
  );

  if (isDisabled) {
    return (
      <div
        className={
          tile.comingSoon ? "cursor-not-allowed opacity-60" : "cursor-default"
        }
      >
        {content}
      </div>
    );
  }

  return (
    <Link to={tile.href} className="block hover:bg-surface transition">
      {content}
    </Link>
  );
};

const More = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const creator = isCreator(user);
  const canUserSchedule = canSchedule(user); // any verified tier
  const canUserPromote = canPromote(user);   // business tier only
  const [collabLoading, setCollabLoading] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(null);

  // Load scheduled post count badge for any verified tier that can schedule
  useEffect(() => {
    if (!canUserSchedule) return;
    api
      .get("/posts/scheduled")
      .then((r) => setScheduledCount(r.data.posts?.length || 0))
      .catch(() => {});
  }, [creator, canUserSchedule]);

  const handleToggleCollab = async () => {
    setCollabLoading(true);
    try {
      const next = !user?.openToCollabs;
      await api.put("/users/collab-status", { openToCollabs: next });
      updateUser({ openToCollabs: next });
      toast.success(
        next ? "Collab status enabled!" : "Collab status disabled.",
      );
    } catch {
      toast.error("Failed to update collab status.");
    } finally {
      setCollabLoading(false);
    }
  };

  const GENERAL_TILES = [
    {
      icon: FaRegBookmark,
      label: "Saved posts",
      description: "Posts you've bookmarked.",
      href: "/bookmarks",
    },
    {
      icon: FaAward,
      label: "Tiers & benefits",
      description: "What each verification badge unlocks.",
      href: "/tiers",
    },
    {
      icon: FaQuestionCircle,
      label: "Help & Support",
      description: "FAQs, guides, and how to reach us.",
      href: "/help",
    },
    {
      icon: FaShieldAlt,
      label: "Privacy Policy",
      description: "What we collect and how it's used.",
      href: "/privacy",
    },
    {
      icon: FaFileContract,
      label: "Terms of Use",
      description: "The rules for using Tronites.",
      href: "/terms",
    },
    canUserPromote
      ? {
          icon: FaBullhorn,
          label: "My Promotions",
          description: "View and manage your promoted posts.",
          href: "/my-promotions",
        }
      : {
          icon: FaBullhorn,
          label: "Ads",
          description: "Promote posts and manage campaigns.",
          href: null,
          comingSoon: true,
        },
  ];

  // Creator-only tiles (analytics dashboard + collabs)
  const CREATOR_TILES = [
    {
      icon: FaChartBar,
      label: "Dashboard",
      description: "Post analytics and reach insights.",
      href: "/dashboard",
    },
    // Pinned post handled separately via PostCard on profile;
    // this tile deep-links to own profile so the user can pin there.
    {
      icon: FaThumbtack,
      label: "Pin a post",
      description: "Head to your profile, open a post's ⋯ menu, then pin it to the top.",
      href: `/profile/${user?._id}`,
    },
  ];

  // Scheduling tile — shown to ALL verified tiers (Individual, Creator, Business, Government, Staff)
  const SCHEDULING_TILE = {
    icon: FaCalendarAlt,
    label: "Scheduled Posts",
    description: "Manage your queued posts.",
    href: "/scheduled-posts",
    badge: scheduledCount || null,
  };

  return (
    <MainLayout>
      <button
        onClick={() =>
          window.history.length > 1 ? navigate(-1) : navigate("/")
        }
        className="inline-flex items-center gap-1.5 text-base font-medium text-ink-muted hover:text-ink mb-4 transition"
      >
        <FaArrowLeft size={13} />
        Back
      </button>

      <h1 className="text-2xl font-bold text-ink mb-1">More</h1>
      <p className="text-base text-ink-muted mb-6">
        Support, legal info, and creator tools.
      </p>

      {/* ── Creator section ── */}
      {creator && (
        <>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2 px-1">
            ✦ Creator tools
          </p>
          <div className="bg-card border border-stroke rounded-2xl divide-y divide-stroke overflow-hidden mb-5">
            {CREATOR_TILES.map((tile) => (
              <Tile key={tile.label} tile={tile} />
            ))}
            {/* Scheduling is part of creator section when user is a creator */}
            <Tile tile={SCHEDULING_TILE} />

            {/* Open to collabs toggle */}
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-primary-50 text-primary-600">
                <FaHandshake size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-ink">
                  Open to collabs
                </p>
                <p className="text-sm text-ink-muted mt-0.5">
                  {user?.openToCollabs
                    ? "Visible on your profile — brands can see you're available."
                    : "Show brands and creators you're open to partnerships."}
                </p>
              </div>
              <button
                onClick={handleToggleCollab}
                disabled={collabLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  user?.openToCollabs ? "bg-primary-600" : "bg-stroke"
                } ${collabLoading ? "opacity-50" : ""}`}
                aria-label="Toggle open to collabs"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    user?.openToCollabs ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Scheduling section — verified non-creators only ── */}
      {canUserSchedule && !creator && (
        <>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2 px-1">
            ✦ Verified tools
          </p>
          <div className="bg-card border border-stroke rounded-2xl divide-y divide-stroke overflow-hidden mb-5">
            <Tile tile={SCHEDULING_TILE} />
            {/* Pin a post — available to any verified tier with pinLimit > 0 */}
            {isVerified(user) && (
              <Tile
                tile={{
                  icon: FaThumbtack,
                  label: "Pin a post",
                  description: "Head to your profile, open a post's ⋯ menu, then pin it to the top.",
                  href: `/profile/${user?._id}`,
                }}
              />
            )}
          </div>
        </>
      )}

      {/* ── General section ── */}
      <p className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2 px-1">
        General
      </p>
      <div className="bg-card border border-stroke rounded-2xl divide-y divide-stroke overflow-hidden">
        {/* Dashboard locked tile for non-creators */}
        {!creator && (
          <div className="flex items-center gap-4 px-5 py-4 opacity-60 cursor-default">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-surface text-ink-muted">
              <FaChartBar size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-ink-muted flex items-center gap-2">
                Dashboard
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded flex items-center gap-1"
                  style={{ backgroundColor: "#9B59D015", color: "#9B59D0" }}
                >
                  <FaLock size={8} />
                  Creators only
                </span>
              </p>
              <p className="text-sm text-ink-muted mt-0.5">
                Available to verified creators.
              </p>
            </div>
          </div>
        )}
        {GENERAL_TILES.map((tile) => (
          <Tile key={tile.label} tile={tile} />
        ))}
      </div>
    </MainLayout>
  );
};

export default More;
