import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/Nav";
import { EmptyState } from "@/components/ui/EmptyState";
import { CourseCard } from "@/components/ui/CourseCard";
import { Icon } from "@/components/ui/Icon";
import { prisma } from "@/lib/db";
import { formatCourseDuration } from "@/lib/course-duration";
import { coursePosterUrl } from "@/lib/course-poster";

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
      include: {
        modules: { select: { _count: { select: { lessons: true } } } },
        project: { select: { skillId: true } },
      },
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

  const fieldClass =
    "min-h-11 rounded-lg border border-ink-300 bg-white px-3 py-2 text-base outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100 sm:text-sm";

  return (
    <>
      <Nav />
      <main className="w-full flex-1">
        <section className="signal-field text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <h1 className="max-w-2xl font-display text-4xl font-bold text-white sm:text-5xl">
              Find a skill to work on this week
            </h1>
            <p className="mt-3 max-w-xl text-lg text-brand-100">
              Practical, competency-based courses for real workplace skills. Every one is free.
            </p>

            <form method="GET" role="search" className="mt-8 flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-overlay sm:flex-row">
              <label htmlFor="course-search" className="sr-only">
                Search courses
              </label>
              <div className="relative flex-1">
                <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  id="course-search"
                  type="text"
                  name="q"
                  placeholder="Search courses…"
                  defaultValue={q}
                  className={`${fieldClass} w-full border-transparent pl-10 text-ink-900`}
                />
              </div>
              <label htmlFor="course-category" className="sr-only">
                Category
              </label>
              <select id="course-category" name="category" defaultValue={category ?? ""} className={`${fieldClass} text-ink-900`}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.category}
                  </option>
                ))}
              </select>
              <label htmlFor="course-level" className="sr-only">
                Level
              </label>
              <select id="course-level" name="level" defaultValue={level ?? ""} className={`${fieldClass} text-ink-900`}>
                <option value="">All levels</option>
                {levels.map((l) => (
                  <option key={l.level} value={l.level}>
                    {l.level}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="min-h-11 cursor-pointer rounded-lg bg-action-500 px-5 text-sm font-semibold text-white hover:bg-action-600"
              >
                Search
              </button>
            </form>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink-500">
              {courses.length} course{courses.length === 1 ? "" : "s"}
              {hasFilters ? " match your search" : ""}
            </p>
            {hasFilters && (
              <Link href="/courses" className="text-sm font-medium text-brand-600 hover:underline">
                Clear search
              </Link>
            )}
          </div>

          {courses.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title={hasFilters ? "No courses match your search" : "No courses published yet"}
                description={
                  hasFilters
                    ? "Try a different search term or clear the filters."
                    : "Check back soon. Course browsing and enrolment are live, waiting on the first published course."
                }
                action={
                  hasFilters ? (
                    <Link href="/courses" className="text-sm font-medium text-brand-600 hover:underline">
                      Show all courses
                    </Link>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {courses.map((course) => (
                <Link key={course.id} href={`/courses/${course.slug}`} className="rounded-xl">
                  <CourseCard
                    title={course.title}
                    category={course.category}
                    level={course.level}
                    description={course.description}
                    durationLabel={formatCourseDuration(course)}
                    posterUrl={coursePosterUrl(course)}
                    lessonCount={course.modules.reduce((sum, m) => sum + m._count.lessons, 0)}
                    certificateEligible={Boolean(course.project?.skillId)}
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
