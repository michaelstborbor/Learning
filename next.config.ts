import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

// Security headers added in Stage F4's audit pass. These are cheap,
// broadly-supported protections against a handful of common attack
// classes (clickjacking, MIME-sniffing, referrer leakage) — see
// SECURITY.md for the full audit this came out of.
const securityHeaders = [
  // Prevents the site from being framed by another origin — the standard
  // clickjacking defense. DENY rather than SAMEORIGIN since nothing here
  // legitimately needs to be embedded in a frame.
  { key: "X-Frame-Options", value: "DENY" },
  // Stops browsers from trying to guess a response's content type in a
  // way that could turn a non-executable upload into executable content.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Sends the referring URL to other sites only when navigating to
  // another HTTPS origin, and only the origin (not the full path/query) —
  // limits what leaks to third parties via outbound links.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Explicitly denies access to sensitive browser APIs this app has no
  // use for, rather than leaving them at the browser's default (which
  // often allows them).
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Browsers only ever reach the site over HTTPS for the next two years,
  // even if someone types http:// or follows an old link.
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  // Content Security Policy. These directives can't break any feature and
  // close off real attacks: no framing by other sites, no plugins, no
  // <base> hijacking, forms only post back to this site, and every request
  // is upgraded to HTTPS. A script allow-list is deliberately left out:
  // Next.js, Vercel BotID and Vercel Analytics need inline and same-origin
  // scripts, and a list that blocks one of them would break sign-in.
  {
    key: "Content-Security-Policy",
    value: [
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // Only on Vercel, which always serves HTTPS; a local `next start`
      // on plain http://localhost would otherwise break.
      ...(process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
    ].join("; "),
  },
  // Keeps other sites' windows from getting a handle on ours (tab-napping).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework in an X-Powered-By header.
  poweredByHeader: false,
  // BOT_PROTECTION=off switches Vercel BotID off in the browser too (see
  // src/instrumentation-client.ts); the server reads BOT_PROTECTION directly.
  env: {
    NEXT_PUBLIC_BOT_PROTECTION: process.env.BOT_PROTECTION === "off" ? "off" : "on",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// withBotId serves Vercel BotID's browser check from this site's own domain
// (see src/instrumentation-client.ts and src/lib/bot-check.ts).
export default withBotId(nextConfig);
