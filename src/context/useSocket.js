import { useContext } from "react";
import { SocketContext } from "./socketContextObject";

export const useSocket = () => useContext(SocketContext);
