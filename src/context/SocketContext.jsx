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
        query: {
          userId: user._id,
        },
        transports: ["websocket"], // Enforce WebSocket only
      });

      setSocket(newSocket);

      newSocket.on("getOnlineUsers", (users) => {
        setOnlineUsers(users);
      });

      return () => {
        newSocket.disconnect();
        setSocket(null);
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
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
