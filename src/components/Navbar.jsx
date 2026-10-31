import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  FiHome,
  FiCompass,
  FiMessageSquare,
  FiBell,
  FiPlus,
} from "react-icons/fi";
import { useAuth } from "../context/useAuth";
import { useSocket } from "../context/useSocket";
import useUnreadNotifications from "../hooks/useUnreadNotifications";
import useTextFieldFocus from "../hooks/useTextFieldFocus";
import { isCreator } from "../utils/creator";
import { NEW_POST_EVENT } from "../constants/events";
import BrandMark from "./ui/BrandMark";
import LogoutModal from "./LogoutModal";
import UserMenu from "./UserMenu";

const isActivePath = (pathname, to) =>
  pathname === to || pathname.startsWith(`${to}/`);

const fmtBadge = (n) => (n > 9 ? "9+" : String(n));

// ── Desktop sidebar row: "01  FEED" ────────────────────────────────────────
const SideLink = ({ to, label, index, badge, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    aria-current={active ? "page" : undefined}
    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-[13px] uppercase tracking-[0.08em] transition ${
      active
        ? "bg-[#f4eee1] text-[#16140f] shadow-[3px_3px_0_0_#f2b531]"
        : "text-[#f4eee1]/70 hover:bg-white/5 hover:text-[#f4eee1]"
    }`}
  >
    <span
      className={active ? "text-primary-600" : "text-[#f4eee1]/40"}
      aria-hidden="true"
    >
      {String(index + 1).padStart(2, "0")}
    </span>
    <span className="flex-1">{label}</span>
    {badge > 0 && (
      <span
        aria-label={`${badge} unread`}
        className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-[#16140f]"
      >
        {fmtBadge(badge)}
      </span>
    )}
  </Link>
);

// ── Mobile bottom-bar tab ──────────────────────────────────────────────────
const TabLink = ({ to, label, icon: Icon, badge, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    aria-current={active ? "page" : undefined}
    className={`relative flex h-full flex-col items-center justify-center gap-0.5 transition ${
      active ? "text-ink" : "text-ink-muted"
    }`}
  >
    {active && (
      <span
        aria-hidden="true"
        className="absolute -top-0.5 h-1 w-8 rounded-b bg-accent"
      />
    )}
    <span className="relative">
      <Icon size={22} strokeWidth={active ? 2.6 : 2} />
      {badge > 0 && (
        <span
          aria-label={`${badge} unread`}
          className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded bg-accent px-1 text-[10px] font-bold leading-none text-[#16140f]"
        >
          {fmtBadge(badge)}
        </span>
      )}
    </span>
    <span className="font-mono text-[10px] uppercase tracking-wider">
      {label}
    </span>
  </Link>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  // unreadCount lives in SocketContext, shared with the Chat page (Chat
  // refreshes it right after marking a thread read).
  const { unreadCount } = useSocket();
  const { count: alertCount, clear: clearAlerts } = useUnreadNotifications();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const typing = useTextFieldFocus();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  if (!user) return null;

  // The composer lives on Home (it owns the post-refresh callbacks). On
  // Home we poke it directly; elsewhere we route there and ask it to open.
  const openComposer = () => {
    if (pathname === "/home") {
      window.dispatchEvent(new Event(NEW_POST_EVENT));
    } else {
      navigate("/home", { state: { compose: true } });
    }
  };

  const openAlerts = () => clearAlerts();

  const sideItems = [
    { to: "/home", label: "Feed" },
    { to: "/explore", label: "Explore" },
    { to: "/chat", label: "Messages", badge: unreadCount },
    {
      to: "/notifications",
      label: "Alerts",
      badge: alertCount,
      onClick: openAlerts,
    },
    // Creator-only, like the Earnings tile on the More page.
    ...(isCreator(user) ? [{ to: "/creator-earnings", label: "Earnings" }] : []),
    { to: `/profile/${user._id}`, label: "Profile" },
  ];

  return (
    <>
      {/* ── Desktop sidebar (lg+) ─────────────────────────────────────── */}
      <aside
        aria-label="Main navigation"
        className="fixed inset-y-0 left-0 z-40 hidden w-(--sidebar-w) flex-col overflow-y-auto border-r border-(--sidebar-line) bg-(--sidebar-bg) px-4 pb-4 pt-6 lg:flex"
      >
        <Link to="/home" className="mb-8 block px-2" aria-label="Tronites home">
          <BrandMark tone="light" size={34} />
        </Link>

        <nav className="flex flex-col gap-1.5">
          {sideItems.map((item, i) => (
            <SideLink
              key={item.to}
              index={i}
              active={isActivePath(pathname, item.to)}
              {...item}
            />
          ))}
        </nav>

        <button
          type="button"
          onClick={openComposer}
          className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-[15px] font-bold text-[#16140f] shadow-[4px_4px_0_0_var(--color-primary-600)] transition hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_0_var(--color-primary-600)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <FiPlus size={18} strokeWidth={3} />
          New post
        </button>

        <div className="mt-auto border-t border-dashed border-[#f4eee1]/25 pt-3">
          <UserMenu
            variant="chip"
            user={user}
            onLogoutClick={() => setShowLogoutModal(true)}
          />
        </div>
      </aside>

      {/* ── Mobile / tablet top bar (<lg) ─────────────────────────────── */}
      <header className="pt-safe sticky top-0 z-40 border-b-2 border-line bg-surface/95 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/home" aria-label="Tronites home">
            <BrandMark size={30} />
          </Link>
          <UserMenu
            user={user}
            onLogoutClick={() => setShowLogoutModal(true)}
          />
        </div>
      </header>

      {/* ── Mobile / tablet bottom bar (<lg) ──────────────────────────── */}
      {!typing && (
        <nav
          aria-label="Main navigation"
          className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-card lg:hidden"
        >
          <div className="mx-auto grid h-(--bottom-bar-h) max-w-xl grid-cols-5 items-stretch">
            <TabLink
              to="/home"
              label="Feed"
              icon={FiHome}
              active={isActivePath(pathname, "/home")}
            />
            <TabLink
              to="/explore"
              label="Explore"
              icon={FiCompass}
              active={isActivePath(pathname, "/explore")}
            />
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={openComposer}
                aria-label="New post"
                className="-mt-5 grid h-12 w-12 place-items-center rounded-xl border-2 border-line bg-accent text-[#16140f] shadow-hard-sm transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <FiPlus size={24} strokeWidth={3} />
              </button>
            </div>
            <TabLink
              to="/chat"
              label="Chats"
              icon={FiMessageSquare}
              badge={unreadCount}
              active={isActivePath(pathname, "/chat")}
            />
            <TabLink
              to="/notifications"
              label="Alerts"
              icon={FiBell}
              badge={alertCount}
              onClick={openAlerts}
              active={isActivePath(pathname, "/notifications")}
            />
          </div>
        </nav>
      )}

      {showLogoutModal &&
        createPortal(
          <LogoutModal
            onConfirm={handleLogout}
            onCancel={() => setShowLogoutModal(false)}
          />,
          document.body,
        )}
    </>
  );
};

export default Navbar;
