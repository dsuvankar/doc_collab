import { SignJWT, jwtVerify } from "jose";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { UserJWT } from "../types.js";
import dotenv from "dotenv";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  
  return timingSafeEqual(keyBuffer, derivedKey);
}

dotenv.config();

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set in the environment");
  }
  return new TextEncoder().encode(secret);
};

export async function signToken(payload: UserJWT): Promise<string> {
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
  return token;
}

export async function verifyToken(token: string): Promise<UserJWT> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as UserJWT;
}
