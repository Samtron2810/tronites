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
} from "react-icons/fa";
import { useAuth } from "../context/useAuth";

// Returns true if the user holds an active (non-expired) creator badge.
const isCreator = (user) =>
  Array.isArray(user?.verifications) &&
  user.verifications.some(
    (v) =>
      v.type === "creator" &&
      (!v.expiresAt || new Date(v.expiresAt) > new Date()),
  );

const More = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const creator = isCreator(user);

  const TILES = [
    {
      icon: FaRegBookmark,
      label: "Saved posts",
      description: "Posts you've bookmarked.",
      href: "/bookmarks",
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
    // Dashboard: live for verified creators, locked for everyone else.
    {
      icon: FaChartBar,
      label: "Dashboard",
      description: creator
        ? "Post analytics and reach insights."
        : "Available to verified creators.",
      href: creator ? "/dashboard" : null,
      creatorOnly: true,
      locked: !creator,
    },
    {
      icon: FaBullhorn,
      label: "Ads",
      description: "Promote posts and manage campaigns.",
      href: null,
      comingSoon: true,
    },
  ];

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <MainLayout>
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-base font-medium text-ink-muted hover:text-ink mb-4 transition"
      >
        <FaArrowLeft size={13} />
        Back
      </button>

      <h1 className="text-2xl font-bold text-ink mb-1">More</h1>
      <p className="text-base text-ink-muted mb-6">
        Support, legal info, and other tools.
      </p>

      <div className="bg-card border border-stroke rounded-2xl divide-y divide-stroke overflow-hidden">
        {TILES.map((tile) => {
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
                  {tile.locked && (
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded flex items-center gap-1"
                      style={{ backgroundColor: "#9B59D015", color: "#9B59D0" }}
                    >
                      <FaLock size={8} />
                      Creators only
                    </span>
                  )}
                  {tile.creatorOnly && creator && (
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: "#9B59D015", color: "#9B59D0" }}
                    >
                      ✦ Creator
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
                key={tile.label}
                className={tile.comingSoon ? "cursor-not-allowed opacity-60" : "cursor-default"}
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={tile.label}
              to={tile.href}
              className="block hover:bg-surface transition"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </MainLayout>
  );
};

export default More;
