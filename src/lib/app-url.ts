// The site's public origin, used for email links, metadata, robots and the
// sitemap. APP_BASE_URL wins when it holds a valid URL. An empty or
// malformed value falls back to the production URL Vercel provides, so a
// missing setting can't fail the build with "Invalid URL".
export function appBaseUrl(): string {
  const candidates = [
    process.env.APP_BASE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL &&
      `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    try {
      return new URL(value).origin;
    } catch {
      // Not a URL; try the next source.
    }
  }
  return "http://localhost:3000";
}
