import { Socket } from "socket.io";
import { verifyToken } from "../lib/auth.js";

export const socketAuth = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const cookieHeader = socket.request.headers.cookie;
    if (!cookieHeader) {
      return next(new Error("UNAUTHORIZED"));
    }
    const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
    const token = cookies.token;
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
