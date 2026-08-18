import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { createPortal } from "react-dom";
import logo from "../assets/tronite-logo.png";
import { FaHome, FaCompass, FaComments } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import NotificationBell from "./NotificationBell";
import LogoutModal from "./LogoutModal";
import UserMenu from "./UserMenu";

const NavLink = ({ to, icon: Icon, label, badge }) => {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-primary-100 text-primary-600"
          : "text-ink-sub hover:text-ink hover:bg-primary-50"
      }`}
    >
      <Icon className="text-base" />
      <span className="hidden lg:inline">{label}</span>
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 rounded-full bg-primary-600 text-white text-xs font-bold px-1">
          {badge}
        </span>
      )}
    </Link>
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  // unreadCount now lives in SocketContext, shared with the Chat page.
  // Chat calls refreshUnreadCount() itself right after marking a thread
  // read, so the badge no longer depends on a "messagesRead" socket
  // event round-tripping back before it updates — that round trip was
  // the source of the stale-badge-until-refresh bug, since Chat's own
  // socket didn't join the conversation room until after the read
  // request (and its resulting event) had already gone out.
  const { unreadCount } = useSocket();
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

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stroke">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6 h-14">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img
            src={logo}
            alt="Tronites"
            className="h-8 w-auto object-contain"
          />
          <span className="font-bold text-ink text-lg hidden sm:inline">
            Tron<span className="text-primary-600">ites</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <NavLink to="/" icon={FaHome} label="Feed" />
          <NavLink to="/explore" icon={FaCompass} label="Explore" />
          <NavLink
            to="/chat"
            icon={FaComments}
            label="Messages"
            badge={unreadCount}
          />
          <NotificationBell />
          <UserMenu
            user={user}
            onLogoutClick={() => setShowLogoutModal(true)}
          />
        </div>
      </div>

      {showLogoutModal &&
        createPortal(
          <LogoutModal
            onConfirm={handleLogout}
            onCancel={() => setShowLogoutModal(false)}
          />,
          document.body,
        )}
    </nav>
  );
};

export default Navbar;
