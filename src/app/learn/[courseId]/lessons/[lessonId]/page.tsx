import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/ui/Nav";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { CompleteLessonButton } from "@/components/courses/CompleteLessonButton";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { courseId, lessonId } = await params;

  const enrolment = await prisma.enrolment.findUnique({
    where: { learnerId_courseId: { learnerId: session.userId, courseId } },
  });
  if (!enrolment) redirect(`/learn/${courseId}`);

  // Flatten every lesson in the course, in module/lesson order, so we can
  // work out prev/next without a separate query per direction.
  const modules = await prisma.module.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
  const allLessons = modules.flatMap((m: any) => m.lessons);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
  const currentIndex = allLessons.findIndex((l: any) => l.id === lessonId);
  const lesson = allLessons[currentIndex];
  if (!lesson) notFound();

  const previous = allLessons[currentIndex - 1];
  const next = allLessons[currentIndex + 1];

  const progress = await prisma.lessonProgress.findUnique({
    where: { learnerId_lessonId: { learnerId: session.userId, lessonId } },
  });

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <Link href={`/learn/${courseId}`} className="text-sm text-brand-600 hover:underline">
          ← Back to course
        </Link>

        <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">
          {lesson.title}
        </h1>

        <div className="mt-6 whitespace-pre-wrap text-ink-700">
          {lesson.content}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-ink-100 pt-6">
          <CompleteLessonButton lessonId={lesson.id} alreadyComplete={Boolean(progress)} />
          <div className="flex gap-3 text-sm">
            {previous && (
              <Link
                href={`/learn/${courseId}/lessons/${previous.id}`}
                className="text-brand-600 hover:underline"
              >
                ← Previous
              </Link>
            )}
            {next && (
              <Link
                href={`/learn/${courseId}/lessons/${next.id}`}
                className="text-brand-600 hover:underline"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
