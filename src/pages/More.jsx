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
} from "react-icons/fa";

const TILES = [
  {
    icon: FaRegBookmark,
    label: "Saved posts",
    description: "Posts you've bookmarked.",
    href: "/bookmarks",
    disabled: false,
  },
  {
    icon: FaQuestionCircle,
    label: "Help & Support",
    description: "FAQs, guides, and how to reach us.",
    href: "/help",
    disabled: false,
  },
  {
    icon: FaShieldAlt,
    label: "Privacy Policy",
    description: "What we collect and how it's used.",
    href: "/privacy",
    disabled: false,
  },
  {
    icon: FaFileContract,
    label: "Terms of Use",
    description: "The rules for using Tronites.",
    href: "/terms",
    disabled: false,
  },
  {
    icon: FaChartBar,
    label: "Dashboard",
    description: "Post analytics and reach insights.",
    disabled: true,
  },
  {
    icon: FaBullhorn,
    label: "Ads",
    description: "Promote posts and manage campaigns.",
    disabled: true,
  },
];

const More = () => {
  const navigate = useNavigate();

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
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink mb-4 transition"
      >
        <FaArrowLeft size={13} />
        Back
      </button>

      <h1 className="text-xl font-bold text-ink mb-1">More</h1>
      <p className="text-sm text-ink-muted mb-6">
        Support, legal info, and other tools.
      </p>

      <div className="bg-card border border-stroke rounded-2xl divide-y divide-stroke overflow-hidden">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          const content = (
            <div className="flex items-center gap-4 px-5 py-4">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                  tile.disabled
                    ? "bg-surface text-ink-muted"
                    : "bg-primary-50 text-primary-600"
                }`}
              >
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    tile.disabled ? "text-ink-muted" : "text-ink"
                  }`}
                >
                  {tile.label}
                  {tile.disabled && (
                    <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-ink-muted bg-surface px-1.5 py-0.5 rounded">
                      Coming soon
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink-muted mt-0.5 truncate">
                  {tile.description}
                </p>
              </div>
              {!tile.disabled && (
                <FaChevronRight size={12} className="text-ink-muted shrink-0" />
              )}
            </div>
          );

          return tile.disabled ? (
            <div key={tile.label} className="cursor-not-allowed opacity-60">
              {content}
            </div>
          ) : (
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
