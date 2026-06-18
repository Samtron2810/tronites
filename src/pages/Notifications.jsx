import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import NotificationSkeleton from "../components/NotificationSkeleton";
import api from "../services/api";
import { useSocket } from "../context/SocketContext";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get("/notifications");

        setNotifications(res.data);

        await api.put("/notifications/mark-read");
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  useEffect(() => {
    if (socket) {
      const handleNewNotification = async (newNotif) => {
        // Prepend new notification; mark it as read immediately since user is on the Notifications page (prevent duplicates)
        setNotifications((prev) => {
          const exists = prev.some((n) => n._id === newNotif._id);
          if (exists) return prev;
          return [{ ...newNotif, read: true }, ...prev];
        });
        try {
          await api.put("/notifications/mark-read");
        } catch (error) {
          console.log("Failed to mark notifications read:", error);
        }
      };

      socket.on("newNotification", handleNewNotification);

      return () => {
        socket.off("newNotification", handleNewNotification);
      };
    }
  }, [socket]);

  const getMessage = (n) => {
    if (n.type === "like") return "liked your post";
    if (n.type === "comment") return "commented on your post";
    if (n.type === "follow") return "started following you";
    return "";
  };

  const getIcon = (type) => {
    if (type === "like") return "❤️";
    if (type === "comment") return "💬";
    if (type === "follow") return "👤";
    return "🔔";
  };

  return (
    <MainLayout>
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h1>

        {loading && (
          <>
            <NotificationSkeleton />
            <NotificationSkeleton />
            <NotificationSkeleton />
          </>
        )}

        {!loading && notifications.length === 0 && (
          <p className="text-center text-gray-400">No notifications yet.</p>
        )}

        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n._id}
              className={`flex items-center gap-4 p-4 rounded-xl transition ${
                n.read ? "bg-gray-50" : "bg-blue-50"
              }`}
            >
              {/* Avatar */}
              <img
                src={n.sender.profilePic || "https://i.pravatar.cc/"}
                alt={n.sender.name}
                className="w-11 h-11 rounded-full object-cover"
              />

              {/* Message */}
              <div className="flex-1">
                <p className="text-sm text-gray-800">
                  <span className="font-semibold">{n.sender.name}</span>{" "}
                  {getMessage(n)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Icon */}
              <span className="text-xl">{getIcon(n.type)}</span>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Notifications;
