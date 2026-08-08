import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import NotificationSkeleton from "../components/NotificationSkeleton";
import api from "../services/api";
import { useSocket } from "../context/SocketContext";

const typeConfig = {
  like:    { icon: "❤️", label: "liked your post" },
  comment: { icon: "💬", label: "commented on your post" },
  follow:  { icon: "👤", label: "started following you" },
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/notifications");
        setNotifications(res.data);
        await api.put("/notifications/mark-read");
      } catch (e) { console.log(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handle = async (newNotif) => {
      setNotifications((prev) =>
        prev.some((n) => n._id === newNotif._id) ? prev : [{ ...newNotif, read: true }, ...prev]
      );
      try { await api.put("/notifications/mark-read"); } catch (e) { console.log(e); }
    };
    socket.on("newNotification", handle);
    return () => socket.off("newNotification", handle);
  }, [socket]);

  return (
    <MainLayout>
      <div className="bg-white border border-stroke rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stroke">
          <h1 className="text-base font-semibold text-ink">Notifications</h1>
        </div>

        {loading && (
          <div className="divide-y divide-stroke">
            <NotificationSkeleton /><NotificationSkeleton /><NotificationSkeleton />
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-sm text-ink-muted">No notifications yet.</p>
          </div>
        )}

        <div className="divide-y divide-stroke">
          {notifications.map((n) => {
            const cfg = typeConfig[n.type] || { icon: "🔔", label: "" };
            return (
              <div
                key={n._id}
                className={`flex items-center gap-3 px-5 py-4 transition ${n.read ? "" : "bg-primary-50"}`}
              >
                <img
                  src={n.sender?.profilePic || "https://i.pravatar.cc/"}
                  alt={n.sender?.name || "User"}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{n.sender?.name || "Someone"}</span>{" "}
                    <span className="text-ink-sub">{cfg.label}</span>
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-lg shrink-0">{cfg.icon}</span>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default Notifications;
