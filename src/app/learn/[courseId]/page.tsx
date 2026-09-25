import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/ui/Nav";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export default async function LearnCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { courseId } = await params;

  const [course, enrolment, completedLessonIds] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } },
        quiz: true,
        project: true,
      },
    }),
    prisma.enrolment.findUnique({
      where: { learnerId_courseId: { learnerId: session.userId, courseId } },
    }),
    prisma.lessonProgress
      .findMany({
        where: { learnerId: session.userId, lesson: { module: { courseId } } },
        select: { lessonId: true },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
      .then((rows: any[]) => new Set(rows.map((r: any) => r.lessonId))),
  ]);

  if (!course) notFound();
  if (!enrolment) redirect(`/courses/${course.slug}`);

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          {course.title}
        </h1>

        <div className="mt-4">
          <ProgressBar value={enrolment.progressPercent} label="Course progress" />
        </div>

        <div className="mt-8 flex flex-col gap-6">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
          {course.modules.map((moduleItem: any, index: number) => (
            <div key={moduleItem.id}>
              <p className="font-medium text-ink-900">
                {index + 1}. {moduleItem.title}
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
                {moduleItem.lessons.map((lesson: any) => {
                  const done = completedLessonIds.has(lesson.id);
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/learn/${courseId}/lessons/${lesson.id}`}
                        className="flex items-center justify-between rounded-md border border-ink-100 px-4 py-2.5 text-sm hover:border-brand-400"
                      >
                        <span className="text-ink-700">{lesson.title}</span>
                        {done ? (
                          <Badge tone="brand">Done</Badge>
                        ) : (
                          <span className="text-ink-300">→</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {(course.quiz || course.project) && (
          <div className="mt-10 border-t border-ink-100 pt-6">
            <p className="font-medium text-ink-900">Assessments</p>
            <div className="mt-3 flex flex-col gap-2">
              {course.quiz && (
                <Link
                  href={`/learn/${courseId}/quiz`}
                  className="rounded-md border border-ink-100 px-4 py-2.5 text-sm text-ink-700 hover:border-brand-400"
                >
                  Knowledge quiz: {course.quiz.title}
                </Link>
              )}
              {course.project && (
                <Link
                  href={`/learn/${courseId}/project`}
                  className="rounded-md border border-ink-100 px-4 py-2.5 text-sm text-ink-700 hover:border-brand-400"
                >
                  Practical project: {course.project.title}
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
