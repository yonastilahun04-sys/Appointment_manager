import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

const JWT_SECRET =
  process.env["JWT_SECRET"] ??
  "dev-only-secret-do-not-use-in-production-please-set-JWT_SECRET";

const COOKIE_NAME = "appt_session";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
};

export function signToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SessionUser & {
      iat: number;
      exp: number;
    };
    return {
      id: payload.id,
      username: payload.username,
      displayName: payload.displayName,
    };
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function readUserFromRequest(req: Request): SessionUser | null {
  const cookies = (req as Request & { cookies?: Record<string, string> })
    .cookies;
  const token = cookies?.[COOKIE_NAME];
  if (!token) return null;
  return verifyToken(token);
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = readUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  (req as Request & { user?: SessionUser }).user = user;
  next();
}

export async function ensureDefaultAdmin(): Promise<void> {
  const username = "admin";
  const existing = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.username, username));
  if (existing.length > 0) return;
  const password = "admin123";
  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(adminsTable).values({
    id: randomUUID(),
    username,
    passwordHash,
    displayName: "Manager",
  });
  logger.info(
    { username, password },
    "Seeded default admin account (change password in production)",
  );
}

export async function authenticate(
  username: string,
  password: string,
): Promise<SessionUser | null> {
  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.username, username));
  if (!admin) return null;
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return null;
  return {
    id: admin.id,
    username: admin.username,
    displayName: admin.displayName,
  };
}
