import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

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

// ---- Sessions ------------------------------------------------------------
//
// Sessions are a signed JWT stored in an httpOnly, secure cookie — never in
// localStorage or a client-readable place. The JWT itself only carries the
// user id and role: enough to identify who's asking and what they're
// allowed to do, nothing sensitive. The frontend never decides
// authorization; every check in this file runs server-side.

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

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
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

/** Reads and verifies the session cookie. Returns null if absent or invalid —
 * never throws for a missing/expired session, since "not logged in" is a
 * normal, expected state, not an error condition. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return { userId: payload.userId, role: payload.role as UserRole };
  } catch {
    // Expired, tampered, or signed with an old secret — treat as logged out.
    return null;
  }
}

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
