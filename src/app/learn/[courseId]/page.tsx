import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Nav } from "@/components/ui/Nav";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { CourseCover } from "@/components/ui/CourseCover";
import { MediaResourceList } from "@/components/courses/MediaPlayer";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getCourseGrades, type GradeItem } from "@/lib/gradebook";

function QuizRow({
  courseId,
  quiz,
  item,
}: {
  courseId: string;
  quiz: { id: string; title: string; timeLimitMinutes: number | null; _count: { questions: number } };
  item: GradeItem | undefined;
}) {
  return (
    <Link
      href={`/learn/${courseId}/quiz/${quiz.id}`}
      className="flex items-center gap-3 rounded-xl border border-highlight-100 bg-highlight-100/40 px-4 py-3 text-sm hover:border-highlight-500"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-highlight-700">
        <Icon name="quiz" size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-ink-900">{quiz.title}</span>
        <span className="text-xs text-ink-500">
          {quiz._count.questions} question{quiz._count.questions === 1 ? "" : "s"}
          {quiz.timeLimitMinutes ? ` · ${quiz.timeLimitMinutes} min` : ""}
        </span>
      </span>
      {item?.passed ? (
        <Badge tone="brand">Passed {item.score}%</Badge>
      ) : item?.score !== null && item?.score !== undefined ? (
        <Badge tone="neutral">Best {item.score}%</Badge>
      ) : (
        <span className="text-xs font-semibold text-highlight-700">Take quiz</span>
      )}
    </Link>
  );
}

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
        quizzes: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          include: { _count: { select: { questions: true } } },
        },
        project: true,
        media: { where: { status: "READY" }, orderBy: { createdAt: "asc" } },
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
      .then((rows) => new Set(rows.map((r) => r.lessonId))),
  ]);

  if (!course) notFound();
  if (!enrolment) redirect(`/courses/${course.slug}`);

  const { grades } = await getCourseGrades(courseId, [session.userId]);
  const grade = grades.get(session.userId);
  const itemFor = (id: string) => grade?.items.find((i) => i.id === id);

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const nextLesson = allLessons.find((l) => !completedLessonIds.has(l.id));
  const mediaKindsByLesson = new Map<string, Set<string>>();
  course.media.forEach((m) => {
    if (!m.lessonId) return;
    const set = mediaKindsByLesson.get(m.lessonId) ?? new Set();
    set.add(m.kind);
    mediaKindsByLesson.set(m.lessonId, set);
  });
  const courseResources = course.media.filter((m) => !m.lessonId);
  const finalQuizzes = course.quizzes.filter((q) => !q.moduleId);

  return (
    <>
      <Nav />
      <main className="w-full flex-1">
        <CourseCover title={course.title} className="text-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-6 px-4 py-8">
            <div className="max-w-2xl">
              <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white">
                <Icon name="chevronLeft" size={16} /> Dashboard
              </Link>
              <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">{course.title}</h1>
              <p className="mt-2 text-sm text-white/80">
                {completedLessonIds.size} of {allLessons.length} lessons done
                {grade?.currentPercent !== null && grade?.currentPercent !== undefined
                  ? ` · current grade ${grade.currentPercent}% (${grade.letter})`
                  : ""}
              </p>
              {nextLesson ? (
                <Link
                  href={`/learn/${courseId}/lessons/${nextLesson.id}`}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-ink-900 shadow-lg hover:bg-brand-50"
                >
                  <Icon name="play" size={16} />
                  {completedLessonIds.size === 0 ? "Start the first lesson" : `Continue: ${nextLesson.title}`}
                </Link>
              ) : (
                <p className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium">
                  <Icon name="check" size={16} /> All lessons complete
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-overlay">
              <ProgressRing value={enrolment.progressPercent} size={96} stroke={9} label={`Course progress ${enrolment.progressPercent}%`}>
                <span className="text-center">
                  <span className="block font-display text-xl font-bold tabular-nums text-ink-900">
                    {enrolment.progressPercent}%
                  </span>
                  <span className="block text-[11px] text-ink-500">complete</span>
                </span>
              </ProgressRing>
            </div>
          </div>
        </CourseCover>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[1fr_300px]">
          <div className="flex min-w-0 flex-col gap-6">
            {course.modules.map((moduleItem, index) => {
              const done = moduleItem.lessons.filter((l) => completedLessonIds.has(l.id)).length;
              const moduleQuizzes = course.quizzes.filter((q) => q.moduleId === moduleItem.id);
              return (
                <section key={moduleItem.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-raised sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-display text-lg font-semibold text-ink-900">
                      <span className="text-brand-600">Module {index + 1}.</span> {moduleItem.title}
                    </h2>
                    <span className="shrink-0 text-xs tabular-nums text-ink-500">
                      {done}/{moduleItem.lessons.length}
                    </span>
                  </div>
                  <ol className="mt-3 flex flex-col gap-1.5">
                    {moduleItem.lessons.map((lesson) => {
                      const isDone = completedLessonIds.has(lesson.id);
                      const isNext = nextLesson?.id === lesson.id;
                      const kinds = mediaKindsByLesson.get(lesson.id);
                      return (
                        <li key={lesson.id}>
                          <Link
                            href={`/learn/${courseId}/lessons/${lesson.id}`}
                            className={clsx(
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                              isNext ? "bg-brand-50 ring-1 ring-brand-300" : "hover:bg-ink-50",
                            )}
                          >
                            <span
                              className={clsx(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2",
                                isDone ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 text-ink-400",
                              )}
                            >
                              {isDone ? <Icon name="check" size={14} /> : isNext ? <Icon name="play" size={12} /> : null}
                            </span>
                            <span className={clsx("flex-1", isDone ? "text-ink-500" : "text-ink-900")}>
                              {lesson.title}
                              {isDone && <span className="sr-only"> (done)</span>}
                            </span>
                            {kinds?.has("VIDEO") && <Icon name="video" size={16} className="text-ink-400" label="Has video" />}
                            {kinds?.has("AUDIO") && <Icon name="audio" size={16} className="text-ink-400" label="Has audio" />}
                            {kinds?.has("DOCUMENT") && <Icon name="document" size={16} className="text-ink-400" label="Has documents" />}
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                  {moduleQuizzes.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                      {moduleQuizzes.map((quiz) => (
                        <QuizRow key={quiz.id} courseId={courseId} quiz={quiz} item={itemFor(quiz.id)} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}

            {(finalQuizzes.length > 0 || course.project) && (
              <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-raised sm:p-5">
                <h2 className="font-display text-lg font-semibold text-ink-900">Final assessments</h2>
                <p className="mt-1 text-sm text-ink-500">
                  Pass {finalQuizzes.length + course.quizzes.filter((q) => q.moduleId).length > 1 ? "every quiz" : "the quiz"}
                  {course.project ? " and the practical project" : ""} to earn your certificate.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {finalQuizzes.map((quiz) => (
                    <QuizRow key={quiz.id} courseId={courseId} quiz={quiz} item={itemFor(quiz.id)} />
                  ))}
                  {course.project && (
                    <Link
                      href={`/learn/${courseId}/project`}
                      className="flex items-center gap-3 rounded-xl border border-ink-100 px-4 py-3 text-sm hover:border-brand-400"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-verified-100 text-verified-700">
                        <Icon name="briefcase" size={18} />
                      </span>
                      <span className="flex-1 font-medium text-ink-900">{course.project.title}</span>
                      {itemFor(course.project.id)?.passed ? (
                        <Badge tone="verified">Passed</Badge>
                      ) : itemFor(course.project.id)?.attempts ? (
                        <Badge tone="neutral">Submitted</Badge>
                      ) : (
                        <span className="text-xs font-semibold text-brand-600">Open project</span>
                      )}
                    </Link>
                  )}
                </div>
              </section>
            )}
          </div>

          <aside className="flex flex-col gap-6">
            {grade && grade.items.length > 0 && (
              <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-raised">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-ink-900">Your grade</h2>
                  {grade.letter && (
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 font-display text-lg font-bold text-white">
                      {grade.letter}
                    </span>
                  )}
                </div>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {grade.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-ink-700">{item.title}</span>
                      <span className={clsx("tabular-nums", item.passed ? "font-semibold text-brand-700" : "text-ink-500")}>
                        {item.score === null ? "—" : `${item.score}%`}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/grades" className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline">
                  All grades
                </Link>
              </div>
            )}

            {courseResources.length > 0 && (
              <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-raised">
                <h2 className="font-display text-base font-semibold text-ink-900">Course resources</h2>
                <div className="mt-3">
                  <MediaResourceList media={courseResources} compact />
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
