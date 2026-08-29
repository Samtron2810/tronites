import { useEffect, useState } from "react";
import { FiBell } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useSocket } from "../context/useSocket";

const NotificationBell = () => {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();
  const { socket } = useSocket();

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get("/notifications/unread-count");
        setCount(res.data.count);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCount();
    if (!socket) return;
    const handle = () => setCount((p) => p + 1);
    socket.on("newNotification", handle);
    return () => socket.off("newNotification", handle);
  }, [socket]);

  return (
    <button
      onClick={() => {
        setCount(0);
        navigate("/notifications");
      }}
      className="relative flex items-center justify-center px-3 py-2 rounded-lg text-ink-sub hover:text-ink hover:bg-primary-50 transition"
    >
      <FiBell size={24} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center px-1">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
