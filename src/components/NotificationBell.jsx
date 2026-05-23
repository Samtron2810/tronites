import { useEffect, useState } from "react";
import { FaBell } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useSocket } from "../context/SocketContext";

const NotificationBell = () => {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();
  const { socket } = useSocket();

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get("/notifications/unread-count");
        setCount(res.data.count);
      } catch (error) {
        console.log(error);
      }
    };

    fetchCount();

    if (socket) {
      const handleNewNotification = () => {
        setCount((prev) => prev + 1);
      };

      socket.on("newNotification", handleNewNotification);

      return () => {
        socket.off("newNotification", handleNewNotification);
      };
    }
  }, [socket]);

  const handleClick = () => {
    setCount(0);
    navigate("/notifications");
  };

  return (
    <button
      onClick={handleClick}
      className="relative text-gray-700 hover:text-blue-500 transition"
    >
      <FaBell size={22} />
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
