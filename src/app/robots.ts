import type { MetadataRoute } from "next";

// "Authenticated dashboards should not be indexed" (PHASE0_BLUEPRINT.md,
// Phase 27). This is the primary mechanism for that — every route a
// visitor needs to be logged in for is disallowed here. (A per-page
// noindex meta tag would be defense-in-depth on top of this, but robots.txt
// disallow is what every compliant crawler actually respects, and doing it
// once here covers all ~25 protected routes instead of needing a change to
// every individual page file.)
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account",
        "/dashboard",
        "/skills",
        "/certificates",
        "/applications",
        "/learn",
        "/instructor",
        "/organization",
        "/review",
        "/admin",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/api",
        "/style-guide",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
