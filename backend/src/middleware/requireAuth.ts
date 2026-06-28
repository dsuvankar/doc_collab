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
  const token = req.cookies.token;

  if (!token) {
    res.status(401).json({ error: true, message: "Unauthorized", data: null });
    return;
  }

  try {
    const payload = await verifyToken(token);
    (req as any).user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: true, message: "Invalid or expired token", data: null });
  }
};
