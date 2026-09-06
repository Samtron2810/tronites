import {
  useEffect,
  useState,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "./useAuth";
import api from "../services/api";
import { SocketContext } from "./socketContextObject";

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout, getMe } = useAuth();

  // Single source of truth for the navbar badge. Both the Navbar (on
  // mount / on socket events) and the Chat page (right after it marks
  // a thread read) call this instead of each keeping their own copy —
  // that's what caused the badge to only update after a full reload:
  // Chat had no way to tell Navbar's local state to refresh.
  //
  // Uses a dedicated endpoint that counts ALL unread messages across
  // every conversation — not capped to the first 50.
  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("/messages/unread-count");
      setUnreadCount(res.data.total ?? 0);
    } catch {
      // leave the last known count in place on failure
    }
  }, []);

  useEffect(() => {
    if (user) {
      // Derive the socket origin via URL parsing, not string replacement.
      // api.defaults.baseURL can be an absolute URL (e.g.
      // "https://api.example.com/api") or a bare relative path ("/api"),
      // and the old `apiURL.replace("/api", "")` broke on the absolute
      // case: the FIRST "/api" substring in
      // "https://api.example.com/api" is the slash right before the
      // "api." hostname, not the trailing path — replacing it produced an
      // invalid origin. new URL()'s second argument only applies when the
      // first is relative, so this correctly handles both shapes.
      const socketOrigin = new URL(
        api.defaults.baseURL || "http://localhost:5000/api",
        window.location.origin,
      ).origin;

      const newSocket = io(socketOrigin, {
        withCredentials: true, // send the httpOnly JWT cookie so the server can authenticate the connection
        // Not forcing websocket-only here: that skips Socket.IO's normal
        // polling-first-then-upgrade handshake, which is more resilient
        // to proxies/load balancers that don't cleanly support a
        // WebSocket upgrade on the first request.
      });

      // Deferred (not called synchronously in the effect body) so this
      // satisfies react-hooks/set-state-in-effect — the socket instance
      // itself is still created/torn down by this effect as usual.
      queueMicrotask(() => setSocket(newSocket));

      newSocket.on("getOnlineUsers", (users) => {
        setOnlineUsers(users);
      });

      // Self-heal: right after a (re)connect, explicitly ask the server
      // for the current list instead of only waiting on the next
      // connect/disconnect broadcast from someone else. Covers the
      // case where this client missed a broadcast while its own
      // connection was blipping.
      newSocket.on("connect", () => {
        newSocket.emit("getOnlineUsers:request");
      });

      // A disconnect here can be a real logout OR a transient network
      // blip that socket.io will auto-reconnect from. Don't blank the
      // list on every blip — that causes a visible "everyone offline"
      // flash on flaky connections. Only clear when the disconnect
      // won't be retried by socket.io itself.
      newSocket.on("disconnect", (reason) => {
        if (
          reason === "io server disconnect" ||
          reason === "io client disconnect"
        ) {
          setOnlineUsers([]);
        }
        // otherwise: socket.io is auto-reconnecting — keep the last
        // known list until "connect" fires and requests a fresh one.
      });

      // Auth failed (expired/invalid cookie) — surface it instead of silently hanging
      newSocket.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
      });

      // Keep the badge in sync with events that affect unread state,
      // regardless of which page is currently mounted.
      const onReceiveMessage = (msg) => {
        if (msg.receiver._id === user?._id) {
          setUnreadCount((prev) => prev + 1);
        }
      };
      const onUnreadRefreshNeeded = () => refreshUnreadCount();
      newSocket.on("receiveMessage", onReceiveMessage);
      newSocket.on("messageDeleted", onUnreadRefreshNeeded);
      newSocket.on("messagesRead", onUnreadRefreshNeeded);

      // Phase 2: a moderator suspended/banned this account mid-session.
      // The server has already revoked our refresh token(s) and drops this
      // socket moments after emitting — surface WHY, then log out locally
      // so the UI lands on the login screen instead of limping along on
      // APIs that now 403 every call.
      const onAccountRestricted = (payload = {}) => {
        toast.error(
          payload.message || "Your account has been restricted.",
          { duration: 6000 },
        );
        logout();
      };
      newSocket.on("accountRestricted", onAccountRestricted);

      // Admin changed this user's role or permissions — re-fetch the
      // session so the UI reflects the new access level immediately,
      // without waiting for the 15-minute JWT expiry.
      const onPermissionsChanged = () => {
        getMe({ silent: true });
      };
      newSocket.on("permissionsChanged", onPermissionsChanged);

      // Prime the badge on connect/login.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens inside the async fn, not synchronously here
      refreshUnreadCount();

      // In React 18 dev StrictMode, this effect mounts, cleans up, and
      // re-mounts immediately to surface exactly this kind of bug. If
      // the cleanup below fires while the socket is still mid-handshake
      // (polling → websocket upgrade), disconnecting it aborts the raw
      // WebSocket and Chrome logs "WebSocket is closed before the
      // connection is established" — harmless in practice (a second,
      // real socket connects right after on the re-mount) but noisy.
      // Waiting for "connect" before allowing a disconnect avoids
      // tearing down a socket that hasn't finished connecting yet.
      const safeDisconnect = () => {
        if (newSocket.connected) {
          newSocket.disconnect();
        } else {
          newSocket.once("connect", () => newSocket.disconnect());
        }
      };

      return () => {
        newSocket.off("receiveMessage", onReceiveMessage);
        newSocket.off("messageDeleted", onUnreadRefreshNeeded);
        newSocket.off("messagesRead", onUnreadRefreshNeeded);
        newSocket.off("accountRestricted", onAccountRestricted);
        newSocket.off("permissionsChanged", onPermissionsChanged);
        safeDisconnect();
        setSocket(null);
        setOnlineUsers([]);
        setUnreadCount(0);
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setOnlineUsers([]);
        setUnreadCount(0);
      }
    }
    // `socket` intentionally omitted: it's this effect's own output, not
    // an input — including it would cause the effect to re-run every
    // time it sets its own state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshUnreadCount]);

  return (
    <SocketContext.Provider
      value={{ socket, onlineUsers, unreadCount, refreshUnreadCount }}
    >
      {children}
    </SocketContext.Provider>
  );
};
