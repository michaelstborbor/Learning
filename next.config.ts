import type { NextConfig } from "next";

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
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
