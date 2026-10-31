import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import { useSocket } from "../context/useSocket";

// Unread-notification badge count: fetched once, then bumped by the
// "newNotification" socket event. Same endpoint/event the old
// NotificationBell used — hoisted so the sidebar and the mobile bar share
// one subscription instead of each fetching on their own.
const useUnreadNotifications = () => {
  const [count, setCount] = useState(0);
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

  const clear = useCallback(() => setCount(0), []);
  return { count, clear };
};

export default useUnreadNotifications;
