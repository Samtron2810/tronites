import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Dynamically extract socket host based on api.defaults.baseURL
      const apiURL = api.defaults.baseURL || "http://localhost:5000/api";
      const socketUrl = apiURL.replace("/api", "");

      const newSocket = io(socketUrl, {
        withCredentials: true, // send the httpOnly JWT cookie so the server can authenticate the connection
        transports: ["websocket"], // Enforce WebSocket only
      });

      setSocket(newSocket);

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

      return () => {
        newSocket.disconnect();
        setSocket(null);
        setOnlineUsers([]);
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setOnlineUsers([]);
      }
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
