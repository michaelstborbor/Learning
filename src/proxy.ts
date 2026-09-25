import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Runs on the Edge runtime, so it deliberately does NOT import from
// src/lib/auth.ts (which pulls in bcryptjs — not guaranteed Edge-safe).
// This is a lightweight, redundant first line of defense; the real
// authorization check always happens again, server-side, on the page or
// API route itself (see getSession/requireRole in src/lib/auth.ts). Never
// rely on middleware alone for security.

const PROTECTED_PREFIXES = [
  "/account",
  "/dashboard",
  "/skills",
  "/learn",
  "/instructor",
  "/certificates",
  "/admin",
  "/organization",
  "/applications",
  "/review",
];

export async function proxy(request: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("ecoskills_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));

  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.redirect(new URL("/login", request.url));

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/account/:path*",
    "/dashboard/:path*",
    "/skills/:path*",
    "/learn/:path*",
    "/instructor/:path*",
    "/certificates/:path*",
    "/admin/:path*",
    "/organization/:path*",
    "/applications/:path*",
    "/review/:path*",
  ],
};
