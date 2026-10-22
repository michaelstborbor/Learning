import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// NOTE: Normally this would be `import type { UserRole } from "@prisma/client"`.
// It's defined locally instead because `npx prisma generate` cannot reach
// binaries.prisma.sh from the build sandbox this was authored in (network
// restriction, not a design choice) — see DEVELOPMENT.md for the full note.
// This must be run for real once the project has normal internet access
// (any standard dev machine, or the CI/deploy pipeline), and this type must
// be kept in sync with the `UserRole` enum in prisma/schema.prisma until then.
export type UserRole =
  | "SUPER_ADMIN"
  | "PLATFORM_ADMIN"
  | "INSTRUCTOR"
  | "CONTENT_REVIEWER"
  | "ORGANIZATION"
  | "MENTOR"
  | "LEARNER"
  | "PARTNER_CENTRE";

// ---- Password hashing --------------------------------------------------

const SALT_ROUNDS = 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(
  plainPassword: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

// A real bcrypt hash (cost 12) of a random string nobody knows. Login
// compares against it when the email has no account, so a wrong email takes
// as long as a wrong password and response times don't reveal which emails
// are registered.
const DUMMY_PASSWORD_HASH = "$2b$12$32gSuMbIFXBcmyVPusG7z.FUYjWDb0wHVKemMahTH.724uZbiJcOK";

export async function burnPasswordCheck(plainPassword: string): Promise<void> {
  await bcrypt.compare(plainPassword, DUMMY_PASSWORD_HASH).catch(() => false);
}

// ---- Sessions ------------------------------------------------------------
//
// Sessions are a signed JWT stored in an httpOnly, secure cookie — never in
// localStorage or a client-readable place. The JWT carries the user id, the
// role and the account's session version; nothing sensitive. The frontend
// never decides authorization; every check in this file runs server-side.
//
// Every request also re-reads the account (once per request, see cache()
// below), so a deactivated account, a changed role or a password reset takes
// effect immediately instead of when the 7-day cookie runs out.

const SESSION_COOKIE = "ecoskills_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Copy .env.example to .env and set a real value (see ENVIRONMENT.md).",
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  role: UserRole;
}

export async function createSession(payload: SessionPayload & { sessionVersion: number }): Promise<void> {
  const token = await new SignJWT({ userId: payload.userId, role: payload.role, sv: payload.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getAuthSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Signs the user out on every device by invalidating all their existing
 * session cookies. Use `db` to run it inside a transaction. */
export async function revokeAllSessions(
  userId: string,
  db: Pick<typeof prisma, "user"> = prisma,
): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
}

/** Reads and verifies the session cookie. Returns null if absent or invalid —
 * never throws for a missing/expired session, since "not logged in" is a
 * normal, expected state, not an error condition. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let userId: string;
  let tokenVersion: number;
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") {
      return null;
    }
    userId = payload.userId;
    // Cookies issued before session versions existed carry none; they
    // match accounts that have never been signed out everywhere.
    tokenVersion = typeof payload.sv === "number" ? payload.sv : 0;
  } catch {
    // Expired, tampered, or signed with an old secret — treat as logged out.
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true, sessionVersion: true },
  });
  if (!user || !user.isActive || user.sessionVersion !== tokenVersion) return null;
  // The role comes from the database, not the cookie, so a role change by
  // an administrator applies on the user's next request.
  return { userId, role: user.role as UserRole };
});

/** Use in server components/route handlers that require *any* logged-in
 * user. Returns the session or null — callers decide how to respond
 * (redirect, 401, etc.), this helper never redirects itself so it stays
 * usable from both pages and API routes. */
export async function requireSession(): Promise<SessionPayload | null> {
  return getSession();
}

/** Use when an action requires a *specific* role or set of roles. This is
 * the enforcement point for Rule 7/8/9/10 (permission boundaries) — always
 * call this server-side before performing a privileged action, never rely
 * on the UI having hidden a button. */
export async function requireRole(
  allowedRoles: UserRole[],
): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session) return null;
  if (!allowedRoles.includes(session.role)) return null;
  return session;
}
