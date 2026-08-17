import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import logo from "../assets/tronite-logo.png";
import { FaHome, FaCompass, FaComments } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import NotificationBell from "./NotificationBell";
import LogoutModal from "./LogoutModal";
import UserMenu from "./UserMenu";
import api from "../services/api";

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
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
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

  const fetchUnreadCount = async () => {
    try {
      // Note: sums unread across the first 50 conversations only. A
      // user with more active threads than that would need a dedicated
      // unread-count endpoint for a fully accurate badge.
      const res = await api.get("/messages/conversations", {
        params: { page: 1, limit: 50 },
      });
      const total = res.data.conversations.reduce(
        (sum, c) => sum + (c.unreadCount || 0),
        0,
      );
      setUnreadCount(total);
    } catch {}
  };

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onMsg = (msg) => {
      if (msg.receiver._id === user?._id) setUnreadCount((p) => p + 1);
    };
    const onRefresh = () => fetchUnreadCount();
    socket.on("receiveMessage", onMsg);
    socket.on("messageDeleted", onRefresh);
    socket.on("messagesRead", onRefresh);
    return () => {
      socket.off("receiveMessage", onMsg);
      socket.off("messageDeleted", onRefresh);
      socket.off("messagesRead", onRefresh);
    };
  }, [socket, user?._id]);

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
