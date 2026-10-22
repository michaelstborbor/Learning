import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Nav } from "@/components/ui/Nav";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { CompleteLessonButton } from "@/components/courses/CompleteLessonButton";
import { LessonMedia } from "@/components/courses/MediaPlayer";
import { TutorLauncher } from "@/components/tutor/TutorLauncher";

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
  const [course, modules, completed] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId }, select: { title: true } }),
    prisma.module.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      include: {
        lessons: { orderBy: { order: "asc" } },
        quizzes: { select: { id: true, title: true }, orderBy: { order: "asc" } },
      },
    }),
    prisma.lessonProgress.findMany({
      where: { learnerId: session.userId, lesson: { module: { courseId } } },
      select: { lessonId: true },
    }),
  ]);
  const completedIds = new Set(completed.map((c) => c.lessonId));
  const allLessons = modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title })));
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const lesson = allLessons[currentIndex];
  if (!lesson || !course) notFound();

  const previous = allLessons[currentIndex - 1];
  const next = allLessons[currentIndex + 1];
  const currentModule = modules.find((m) => m.id === lesson.moduleId)!;
  const isLastInModule = currentModule.lessons.at(-1)?.id === lesson.id;
  const moduleQuiz = isLastInModule ? currentModule.quizzes[0] : undefined;

  const media = await prisma.courseMedia.findMany({
    where: { lessonId, status: "READY" },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <Nav />
      <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-8 px-4 sm:px-6 lg:px-8 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 flex max-h-[calc(100dvh-8rem)] flex-col gap-4 overflow-y-auto pr-2">
            <Link href={`/learn/${courseId}`} className="font-display font-semibold text-ink-900 hover:text-brand-600">
              {course.title}
            </Link>
            <ProgressBar value={enrolment.progressPercent} label="Progress" />
            <nav aria-label="Lessons" className="flex flex-col gap-4">
              {modules.map((m, mi) => (
                <div key={m.id}>
                  <p className="text-xs font-semibold text-ink-500">
                    Module {mi + 1}: {m.title}
                  </p>
                  <ol className="mt-1 flex flex-col">
                    {m.lessons.map((l) => {
                      const current = l.id === lesson.id;
                      return (
                        <li key={l.id}>
                          <Link
                            href={`/learn/${courseId}/lessons/${l.id}`}
                            aria-current={current ? "page" : undefined}
                            className={clsx(
                              "flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm",
                              current ? "bg-brand-50 font-semibold text-brand-800" : "text-ink-700 hover:bg-ink-50",
                            )}
                          >
                            <span
                              className={clsx(
                                "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                                completedIds.has(l.id) ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300",
                              )}
                            >
                              {completedIds.has(l.id) && <Icon name="check" size={10} />}
                            </span>
                            {l.title}
                          </Link>
                        </li>
                      );
                    })}
                    {m.quizzes.map((q) => (
                      <li key={q.id}>
                        <Link
                          href={`/learn/${courseId}/quiz/${q.id}`}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-highlight-700 hover:bg-highlight-100/50"
                        >
                          <Icon name="quiz" size={16} /> {q.title}
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <article className="min-w-0 max-w-3xl">
          <Link
            href={`/learn/${courseId}`}
            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline lg:hidden"
          >
            <Icon name="chevronLeft" size={16} /> {course.title}
          </Link>
          <p className="mt-2 text-sm text-ink-500 lg:mt-0">
            {lesson.moduleTitle} · Lesson {currentIndex + 1} of {allLessons.length}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink-900">{lesson.title}</h1>

          {media.length > 0 && (
            <div className="mt-6">
              <LessonMedia media={media} />
            </div>
          )}

          <div className="mt-6 max-w-[68ch] whitespace-pre-wrap text-[1.0625rem] leading-relaxed text-ink-700">
            {lesson.content}
          </div>

          <div className="sticky bottom-0 z-20 -mx-4 mt-10 border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:px-5 sm:py-4 sm:shadow-raised">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CompleteLessonButton lessonId={lesson.id} alreadyComplete={completedIds.has(lesson.id)} />
              <div className="flex items-center gap-2 text-sm">
                {previous && (
                  <Link
                    href={`/learn/${courseId}/lessons/${previous.id}`}
                    className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 font-medium text-ink-700 hover:bg-ink-100"
                  >
                    <Icon name="chevronLeft" size={16} /> Previous
                  </Link>
                )}
                {moduleQuiz ? (
                  <Link
                    href={`/learn/${courseId}/quiz/${moduleQuiz.id}`}
                    className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-highlight-100 px-3 font-semibold text-highlight-700 hover:bg-highlight-100/70"
                  >
                    Module quiz <Icon name="chevronRight" size={16} />
                  </Link>
                ) : (
                  next && (
                    <Link
                      href={`/learn/${courseId}/lessons/${next.id}`}
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      Next <Icon name="chevronRight" size={16} />
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        </article>
      </main>
      <TutorLauncher courseId={courseId} lessonId={lesson.id} />
    </>
  );
}
