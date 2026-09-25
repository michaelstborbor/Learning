import { redirect } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { CourseCard } from "@/components/ui/CourseCard";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { COURSE_AUTHOR_ROLES } from "@/lib/roles";
import { getRecommendedCourses } from "@/lib/recommendations";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (COURSE_AUTHOR_ROLES.includes(session.role)) {
    redirect("/instructor/courses");
  }

  const [enrolments, recommendations] = await Promise.all([
    prisma.enrolment.findMany({
      where: { learnerId: session.userId },
      include: { course: true },
      orderBy: { enrolledAt: "desc" },
    }),
    getRecommendedCourses(session.userId),
  ]);

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Your learning
          </h1>
          <Link href="/skills" className="text-sm font-medium text-brand-600 hover:underline">
            View Skills Passport →
          </Link>
        </div>

        {enrolments.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="You haven't enrolled in any courses yet"
              description="Browse the catalogue to get started."
              action={
                <Link href="/courses" className="text-sm font-medium text-brand-600 hover:underline">
                  Browse courses →
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
            {enrolments.map((enrolment: any) => (
              <Link key={enrolment.id} href={`/learn/${enrolment.courseId}`}>
                <Card className="flex flex-col gap-2">
                  <p className="font-medium text-ink-900">{enrolment.course.title}</p>
                  <ProgressBar value={enrolment.progressPercent} />
                </Card>
              </Link>
            ))}
          </div>
        )}

        {recommendations.courses.length > 0 && (
          <section className="mt-10 border-t border-ink-100 pt-6">
            <h2 className="font-display text-lg font-semibold text-ink-900">
              Recommended for you
            </h2>
            <p className="mt-1 text-sm text-ink-500">{recommendations.reason}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {recommendations.courses.map((course) => (
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
          </section>
        )}
      </main>
    </>
  );
}
