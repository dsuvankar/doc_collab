import { Socket } from "socket.io";
import { verifyToken } from "../lib/auth.js";

export const socketAuth = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("UNAUTHORIZED"));
    }
    const user = await verifyToken(token);
    socket.data.user = user;
    next();
  } catch (error) {
    next(new Error("UNAUTHORIZED"));
  }
};
