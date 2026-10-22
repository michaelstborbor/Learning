import { redirect } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { REVIEWER_ROLES } from "@/lib/roles";
import { ReviewDecisionPanel } from "@/components/courses/ReviewDecisionPanel";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatCourseDuration } from "@/lib/course-duration";

export default async function ReviewQueuePage() {
  const session = await requireRole(REVIEWER_ROLES);
  if (!session) redirect("/login");

  const courses = await prisma.course.findMany({
    where: { status: "UNDER_REVIEW" },
    include: {
      instructor: { select: { fullName: true } },
      modules: { include: { lessons: true } },
      quizzes: { select: { id: true } },
      project: true,
    },
    orderBy: { updatedAt: "asc" },
  });

  // Live courses reviewers can keep up to date (see canUpdateCourseContent).
  const publishedCourses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      slug: true,
      durationMinutes: true,
      estimatedHours: true,
      updatedAt: true,
      instructor: { select: { fullName: true } },
      _count: { select: { modules: true, enrolments: true } },
    },
    orderBy: { title: "asc" },
  });

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">Review queue</h1>
        <p className="mt-1 text-ink-500">
          Courses an instructor has submitted, waiting for a decision.
        </p>

        {courses.length === 0 ? (
          <div className="mt-8">
            <EmptyState title="Nothing waiting for review" description="Check back once an instructor submits a course." />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            {courses.map((course) => {
              const lessonCount = course.modules.reduce(
                (sum, m) => sum + m.lessons.length,
                0,
              );
              return (
                <Card key={course.id} className="flex flex-col gap-3">
                  <div>
                    <p className="font-medium text-ink-900">{course.title}</p>
                    <p className="text-xs text-ink-500">by {course.instructor.fullName}</p>
                  </div>
                  <p className="text-sm text-ink-700">{course.description}</p>
                  <p className="text-sm text-ink-500">
                    {course.category} · {course.level} · {course.modules.length} modules ·{" "}
                    {lessonCount} lessons
                    {course.quizzes.length > 0 &&
                      ` · ${course.quizzes.length} quiz${course.quizzes.length === 1 ? "" : "zes"}`}
                    {course.project && " · has project"}
                  </p>
                  {course.quizzes.length === 0 && !course.project && (
                    <p className="text-sm text-danger-500">
                      No quiz or project — this course can&apos;t certify anyone yet.
                    </p>
                  )}
                  <ReviewDecisionPanel courseId={course.id} />
                </Card>
              );
            })}
          </div>
        )}

        <section aria-labelledby="published-title" className="mt-12">
          <h2 id="published-title" className="font-display text-xl font-semibold text-ink-900">
            Published courses
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Update a live course&apos;s details and duration, its modules and lessons, or its media.
          </p>
          {publishedCourses.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">No courses are published yet.</p>
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-ink-100 rounded-xl border border-ink-100 bg-white">
              {publishedCourses.map((course) => (
                <li key={course.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-ink-900">{course.title}</p>
                    <p className="text-xs text-ink-500">
                      by {course.instructor.fullName} · {course._count.modules} module
                      {course._count.modules === 1 ? "" : "s"} · {formatCourseDuration(course)} ·{" "}
                      {course._count.enrolments} enrolled
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/courses/${course.slug}`}
                      className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-ink-700 hover:bg-ink-100"
                    >
                      View<span className="sr-only"> {course.title}</span>
                    </Link>
                    <Link
                      href={`/instructor/courses/${course.id}/update`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-brand-400 bg-white px-3 text-sm font-semibold text-brand-600 hover:bg-brand-50"
                    >
                      <Icon name="pencil" size={16} /> Update course
                      <span className="sr-only">: {course.title}</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
