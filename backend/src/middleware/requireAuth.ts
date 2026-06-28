import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth.js";
import { UserJWT } from "../types.js";

declare global {
  namespace Express {
    interface Request {
      user?: UserJWT;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: true, message: "Missing or invalid authorization header", data: null });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = await verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: true, message: "Invalid or expired token", data: null });
  }
};
