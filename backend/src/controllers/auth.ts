import { Request, Response } from "express";
import { createUser, getUserByEmail } from "../db/repositories/users.js";
import { hashPassword, signToken, verifyPassword } from "../lib/auth.js";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: true, message: "Missing required fields (email, password, name)", data: null });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await createUser(email, hashedPassword, name);

    const token = await signToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
    });

    res.status(201).json({
      error: false,
      message: "User registered successfully",
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
        token,
      }
    });
  } catch (error: any) {
    if (error.code === "23505") { // postgres unique violation
      res.status(400).json({ error: true, message: "Email already registered", data: null });
      return;
    }
    console.error("Registration error:", error);
    res.status(500).json({ error: true, message: "Internal server error during registration", data: null });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: true, message: "Missing required fields (email, password)", data: null });
      return;
    }

    const user = await getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: true, message: "Invalid credentials", data: null });
      return;
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ error: true, message: "Invalid credentials", data: null });
      return;
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    res.status(200).json({
      error: false,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: true, message: "Internal server error during login", data: null });
  }
};
