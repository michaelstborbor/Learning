import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Runs before every request (except static files), so it stays light and
// deliberately does NOT import from src/lib/auth.ts (which pulls in bcryptjs
// and the database). Three cheap first lines of defense:
//
// 1. Turns away vulnerability scanners and attack tools by user agent, and
//    probes for files this app never has (/.env, /wp-admin, ...).
// 2. Refuses state-changing API requests sent from another website (a
//    cross-site request forgery check on top of SameSite cookies).
// 3. Sends logged-out visitors on protected pages to /login.
//
// None of this replaces the real checks: every page and API route checks
// the session again server-side (see getSession/requireRole in
// src/lib/auth.ts), and sign-up/login are guarded by Vercel BotID (see
// src/lib/bot-check.ts). Never rely on this file alone for security.

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
  "/grades",
];

// Tools used to scan sites for weaknesses or to attack them. Ordinary
// browsers, search engines and link previews are not on this list.
const BLOCKED_AGENTS =
  /sqlmap|nikto|nmap|masscan|zgrab|nuclei|acunetix|nessus|openvas|wpscan|dirbuster|gobuster|feroxbuster|ffuf|hydra|havij|netsparker|appscan|w3af|jorgee|zmeu|fuzz faster/i;

// Paths only an attacker would ask for: secrets, version control, other
// platforms' admin panels.
const PROBE_PATHS =
  /^\/(?:\.env|\.git|\.svn|\.hg|\.aws|\.ssh|\.DS_Store|wp-admin|wp-login|wp-content|wp-includes|xmlrpc\.php|phpmyadmin|pma|cgi-bin|vendor\/phpunit|server-status|config\.php|web\.config|\.well-known\/security\.txt\.bak)(?:\/|$|\.)/i;

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent") ?? "";

  if (BLOCKED_AGENTS.test(userAgent) || PROBE_PATHS.test(pathname)) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (pathname.startsWith("/api/") && MUTATING_METHODS.has(request.method)) {
    // Browsers always send Origin on these requests. A different origin
    // means another website is trying to act with the visitor's cookies.
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin && !sameHost(origin, request)) {
      return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("ecoskills_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));

  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.redirect(new URL("/login", request.url));

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

// The Host header the request arrived with (behind Vercel's edge this is the
// public domain), compared with the Origin's host.
function sameHost(origin: string, request: NextRequest): boolean {
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return host !== null && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const config = {
  // Everything except Next.js build files and images, which never need
  // these checks.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|logo.png).*)"],
};
