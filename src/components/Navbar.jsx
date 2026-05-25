import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  FaHome,
  FaCompass,
  FaUser,
  FaComments,
  FaArrowLeft,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import NotificationBell from "./NotificationBell";
import api from "../services/api";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/messages/conversations");
      const totalUnread = res.data.reduce(
        (sum, conv) => sum + (conv.unreadCount || 0),
        0,
      );
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error("Fetch unread count failed:", error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      if (message.receiver._id === user?._id) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const handleMessageDeleted = () => {
      fetchUnreadCount();
    };

    const handleMessagesRead = () => {
      fetchUnreadCount();
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messagesRead", handleMessagesRead);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("messagesRead", handleMessagesRead);
    };
  }, [socket, user?._id]);

  // Prevent crash while auth is loading
  if (!user) return null;

  return (
    <nav className="bg-orange-300/80 backdrop-blur-md border-b border-orange-200 px-4 sm:px-6 py-4 sticky top-0 z-50">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        {/* Logo */}
        <Link
          to="/"
          className="min-w-0 shrink-0 text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900"
        >
          Tron<span className="text-blue-500">ites</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className="text-gray-800 hover:text-blue-500 font-medium"
          >
            Feed
          </Link>
          <Link
            to="/explore"
            className="text-gray-800 hover:text-blue-500 font-medium"
          >
            Explore
          </Link>
          <Link
            to={`/profile/${user._id}`}
            className="text-gray-800 hover:text-blue-500 font-medium"
          >
            Profile
          </Link>
          <Link
            to="/chat"
            className="text-gray-800 hover:text-blue-500 font-medium relative"
          >
            Messages
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-4 inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </Link>

          <NotificationBell />

          <button
            onClick={logout}
            className="flex items-center justify-center gap-3 bg-red-500 hover:bg-red-800 text-white font-semibold px-4 py-2 rounded-lg transition duration-200"
          >
            Logout <FaUser />
          </button>
        </div>

        {/* Mobile Icons */}
        <div className="flex md:hidden items-center gap-4 text-xl overflow-x-auto whitespace-nowrap">
          <Link to="/" className="text-gray-800 hover:text-blue-500">
            <FaHome />
          </Link>

          <Link to="/explore" className="text-gray-800 hover:text-blue-500">
            <FaCompass />
          </Link>

          <Link
            to="/chat"
            className="text-gray-800 hover:text-blue-500 relative"
          >
            <FaComments />
            {unreadCount > 0 && (
              <span className="absolute -top-3 -right-3 inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </Link>

          <Link
            to={`/profile/${user._id}`}
            className="text-gray-800 hover:text-blue-500"
          >
            <FaUser />
          </Link>

          <NotificationBell />

          <button
            onClick={logout}
            className="flex items-center justify-center gap-3 bg-red-500 hover:bg-red-800 text-white font-semibold px-4 py-2 rounded-lg transition duration-200"
          >
            <FaArrowLeft />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
