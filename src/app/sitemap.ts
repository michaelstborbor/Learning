import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

// Same reasoning as the course/opportunity pages (see ARCHITECTURE.md):
// content changes after deploy, so the sitemap must never be frozen as a
// static build-time snapshot.
export const dynamic = "force-dynamic";

// Dynamic sitemap — includes every published course and open opportunity
// as a live query, so it never goes stale as content is published (the
// same reasoning as the "force-dynamic" course/opportunity pages
// themselves — see ARCHITECTURE.md).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/courses`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/opportunities`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/faqs`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/verify`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const [courses, opportunities] = await Promise.all([
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.opportunity.findMany({
      where: { status: "OPEN" },
      select: { id: true, createdAt: true },
    }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
  const coursePages: MetadataRoute.Sitemap = courses.map((c: any) => ({
    url: `${baseUrl}/courses/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
  const opportunityPages: MetadataRoute.Sitemap = opportunities.map((o: any) => ({
    url: `${baseUrl}/opportunities/${o.id}`,
    lastModified: o.createdAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...coursePages, ...opportunityPages];
}
