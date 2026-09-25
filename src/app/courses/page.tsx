import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/Nav";
import { EmptyState } from "@/components/ui/EmptyState";
import { CourseCard } from "@/components/ui/CourseCard";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Browse practical, competency-based courses for real workplace skills — free to enrol.",
};

// Course data changes after deploy (new courses published, etc.), so this
// page should never be frozen as a static build-time snapshot — always
// rendered fresh per request.
export const dynamic = "force-dynamic";

// Search is a plain GET <form> rather than client-side JS — the whole
// filtered result is server-rendered from the URL's query string. No
// client JavaScript needed for this to work, which matters for the
// low-bandwidth-first principle this platform is built around.
export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; level?: string }>;
}) {
  const { q, category, level } = await searchParams;

  const [courses, categories, levels] = await Promise.all([
    prisma.course.findMany({
      where: {
        status: "PUBLISHED",
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(category ? { category } : {}),
        ...(level ? { level } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      distinct: ["level"],
      select: { level: true },
      orderBy: { level: "asc" },
    }),
  ]);

  const hasFilters = Boolean(q || category || level);

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Courses
        </h1>
        <p className="mt-1 text-ink-500">
          Practical, competency-based courses for real workplace skills.
        </p>

        <form method="GET" className="mt-6 flex flex-wrap gap-3">
          <input
            type="text"
            name="q"
            placeholder="Search courses…"
            defaultValue={q}
            className="min-w-48 flex-1 rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
          />
          <select
            name="category"
            defaultValue={category ?? ""}
            className="rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
          >
            <option value="">All categories</option>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
            {categories.map((c: any) => (
              <option key={c.category} value={c.category}>
                {c.category}
              </option>
            ))}
          </select>
          <select
            name="level"
            defaultValue={level ?? ""}
            className="rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
          >
            <option value="">All levels</option>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
            {levels.map((l: any) => (
              <option key={l.level} value={l.level}>
                {l.level}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-action-500 px-4 py-2 text-sm font-medium text-white hover:bg-action-600"
          >
            Search
          </button>
          {hasFilters && (
            <Link
              href="/courses"
              className="flex items-center text-sm text-ink-500 hover:text-ink-700"
            >
              Clear
            </Link>
          )}
        </form>

        {courses.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={hasFilters ? "No courses match your search" : "No courses published yet"}
              description={
                hasFilters
                  ? "Try a different search term or clear the filters."
                  : "Check back soon — course browsing and enrolment are live, waiting on the first published course."
              }
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
            {courses.map((course: any) => (
              <Link key={course.id} href={`/courses/${course.slug}`}>
                <CourseCard
                  title={course.title}
                  category={course.category}
                  level={course.level}
                  durationLabel={`${course.estimatedHours}h`}
                />
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
