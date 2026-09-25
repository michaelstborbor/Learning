import { redirect } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { REVIEWER_ROLES } from "@/lib/roles";
import { ReviewDecisionPanel } from "@/components/courses/ReviewDecisionPanel";

export default async function ReviewQueuePage() {
  const session = await requireRole(REVIEWER_ROLES);
  if (!session) redirect("/login");

  const courses = await prisma.course.findMany({
    where: { status: "UNDER_REVIEW" },
    include: {
      instructor: { select: { fullName: true } },
      modules: { include: { lessons: true } },
      quiz: true,
      project: true,
    },
    orderBy: { updatedAt: "asc" },
  });

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
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
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
            {courses.map((course: any) => {
              const lessonCount = course.modules.reduce(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
                (sum: number, m: any) => sum + m.lessons.length,
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
                    {course.quiz && " · has quiz"}
                    {course.project && " · has project"}
                  </p>
                  {!course.quiz && !course.project && (
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
      </main>
    </>
  );
}
