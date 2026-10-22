import { redirect } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Nav } from "@/components/ui/Nav";
import { EmptyState } from "@/components/ui/EmptyState";
import { CourseCard } from "@/components/ui/CourseCard";
import { CourseCover } from "@/components/ui/CourseCover";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Icon } from "@/components/ui/Icon";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { COURSE_AUTHOR_ROLES } from "@/lib/roles";
import { getRecommendedCourses } from "@/lib/recommendations";
import { getLearningActivity } from "@/lib/activity";
import { formatCourseDuration } from "@/lib/course-duration";
import { coursePosterUrl } from "@/lib/course-poster";

function greeting(): string {
  // Freetown is on UTC all year.
  const hour = new Date().getUTCHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (COURSE_AUTHOR_ROLES.includes(session.role)) {
    redirect("/instructor/courses");
  }

  const [user, enrolments, recommendations, activity, certificateCount, completedLessons] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { fullName: true } }),
    prisma.enrolment.findMany({
      where: { learnerId: session.userId },
      include: {
        course: {
          include: {
            modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" }, select: { id: true, title: true } } } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    }),
    getRecommendedCourses(session.userId),
    getLearningActivity(session.userId),
    prisma.certificate.count({ where: { learnerId: session.userId, status: "ACTIVE" } }),
    prisma.lessonProgress.findMany({
      where: { learnerId: session.userId },
      select: { lessonId: true, completedAt: true, lesson: { select: { module: { select: { courseId: true } } } } },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  const doneIds = new Set(completedLessons.map((l) => l.lessonId));
  const lastActive = new Map<string, number>();
  completedLessons.forEach((l) => {
    const courseId = l.lesson.module.courseId;
    if (!lastActive.has(courseId)) lastActive.set(courseId, l.completedAt.getTime());
  });

  // "Continue" = the unfinished course touched most recently, at its next lesson.
  const inProgress = enrolments
    .filter((e) => e.progressPercent < 100)
    .sort(
      (a, b) =>
        (lastActive.get(b.courseId) ?? b.enrolledAt.getTime()) -
        (lastActive.get(a.courseId) ?? a.enrolledAt.getTime()),
    );
  const focus = inProgress[0];
  const focusLessons = focus?.course.modules.flatMap((m) => m.lessons) ?? [];
  const focusNext = focusLessons.find((l) => !doneIds.has(l.id));
  const firstName = user?.fullName.split(" ")[0] ?? "there";
  const weekGoal = 5;

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-1 text-ink-500">
              {activity.activeToday
                ? "You've learned something today. Keep the streak going tomorrow."
                : activity.streak > 0
                  ? `Finish one lesson today to keep your ${activity.streak}-day streak.`
                  : "One lesson today starts a new streak."}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          {focus ? (
            <CourseCover title={focus.course.title} posterUrl={coursePosterUrl(focus.course)} className="rounded-3xl text-white shadow-overlay">
              <div className="flex h-full flex-col justify-between gap-6 p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white/75">Continue where you left off</p>
                    <h2 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">{focus.course.title}</h2>
                    {focusNext && <p className="mt-2 text-white/85">Next: {focusNext.title}</p>}
                  </div>
                  <div className="rounded-2xl bg-white/95 p-1.5">
                    <ProgressRing value={focus.progressPercent} size={72} stroke={7} label={`${focus.progressPercent}% complete`} />
                  </div>
                </div>
                <Link
                  href={focusNext ? `/learn/${focus.courseId}/lessons/${focusNext.id}` : `/learn/${focus.courseId}`}
                  className="inline-flex min-h-12 w-fit items-center gap-2 rounded-xl bg-white px-6 font-semibold text-ink-900 shadow-lg hover:bg-brand-50"
                >
                  <Icon name="play" size={18} /> {focus.progressPercent === 0 ? "Start learning" : "Resume lesson"}
                </Link>
              </div>
            </CourseCover>
          ) : (
            <div className="signal-field flex flex-col justify-between gap-6 rounded-3xl p-6 text-white sm:p-8">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">
                  {enrolments.length ? "Every course finished. Time for a new one?" : "Pick your first course"}
                </h2>
                <p className="mt-2 max-w-md text-brand-100">
                  Courses are free, short, and end with something you can show an employer.
                </p>
              </div>
              <Link
                href="/courses"
                className="inline-flex min-h-12 w-fit items-center gap-2 rounded-xl bg-action-500 px-6 font-semibold text-white hover:bg-action-600"
              >
                <Icon name="search" size={18} /> Browse courses
              </Link>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <section className="rounded-3xl border border-ink-100 bg-white p-5 shadow-raised" aria-labelledby="streak-heading">
              <div className="flex items-center gap-3">
                <span
                  className={clsx(
                    "grid h-12 w-12 place-items-center rounded-2xl",
                    activity.streak > 0 ? "bg-highlight-100 text-highlight-500" : "bg-ink-100 text-ink-400",
                  )}
                >
                  <Icon name="flame" size={26} />
                </span>
                <div>
                  <h2 id="streak-heading" className="font-display text-2xl font-bold tabular-nums text-ink-900">
                    {activity.streak} day{activity.streak === 1 ? "" : "s"}
                  </h2>
                  <p className="text-sm text-ink-500">learning streak</p>
                </div>
              </div>
              <ol className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Your last seven days">
                {activity.week.map((day) => (
                  <li key={day.key} className="flex flex-col items-center gap-1">
                    <span
                      className={clsx(
                        "grid h-8 w-full max-w-9 place-items-center rounded-lg",
                        day.active ? "bg-highlight-500 text-white" : "bg-ink-100 text-transparent",
                        day.isToday && !day.active && "ring-2 ring-highlight-500/40",
                      )}
                    >
                      <Icon name="check" size={14} />
                      <span className="sr-only">{day.active ? "active" : "no activity"}</span>
                    </span>
                    <span className={clsx("text-xs", day.isToday ? "font-semibold text-ink-900" : "text-ink-500")}>
                      {day.label}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-3xl border border-ink-100 bg-white p-5 shadow-raised" aria-labelledby="goal-heading">
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={Math.min(100, (activity.lessonsThisWeek / weekGoal) * 100)}
                  size={64}
                  stroke={7}
                  label={`${activity.lessonsThisWeek} of ${weekGoal} lessons this week`}
                >
                  <span className="font-display text-sm font-bold tabular-nums text-ink-900">
                    {activity.lessonsThisWeek}/{weekGoal}
                  </span>
                </ProgressRing>
                <div>
                  <h2 id="goal-heading" className="font-display text-base font-semibold text-ink-900">
                    Weekly goal
                  </h2>
                  <p className="text-sm text-ink-500">
                    {activity.lessonsThisWeek >= weekGoal
                      ? "Goal reached. Anything more is a bonus."
                      : `${weekGoal - activity.lessonsThisWeek} more lesson${weekGoal - activity.lessonsThisWeek === 1 ? "" : "s"} in the last 7 days`}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <Link href="/grades" className="rounded-xl bg-ink-50 px-2 py-2 hover:bg-brand-50">
                  <span className="block font-display text-lg font-bold tabular-nums text-ink-900">{doneIds.size}</span>
                  <span className="text-xs text-ink-500">lessons done</span>
                </Link>
                <Link href="/certificates" className="rounded-xl bg-ink-50 px-2 py-2 hover:bg-brand-50">
                  <span className="block font-display text-lg font-bold tabular-nums text-ink-900">{certificateCount}</span>
                  <span className="text-xs text-ink-500">certificates</span>
                </Link>
              </div>
            </section>
          </div>
        </div>

        <section className="mt-12">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold text-ink-900">Your courses</h2>
            <Link href="/grades" className="text-sm font-semibold text-brand-600 hover:underline">
              See grades
            </Link>
          </div>
          {enrolments.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="You haven't enrolled in any courses yet"
                description="Browse the catalogue to get started."
                action={
                  <Link href="/courses" className="text-sm font-medium text-brand-600 hover:underline">
                    Browse courses
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {enrolments.map((enrolment) => (
                <Link key={enrolment.id} href={`/learn/${enrolment.courseId}`} className="rounded-xl">
                  <CourseCard
                    title={enrolment.course.title}
                    category={enrolment.course.category}
                    level={enrolment.course.level}
                    durationLabel={formatCourseDuration(enrolment.course)}
                    posterUrl={coursePosterUrl(enrolment.course)}
                    lessonCount={enrolment.course.modules.reduce((sum, m) => sum + m.lessons.length, 0)}
                    progressPercent={enrolment.progressPercent}
                  />
                </Link>
              ))}
            </div>
          )}
        </section>

        {recommendations.courses.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold text-ink-900">Recommended for you</h2>
            <p className="mt-1 text-sm text-ink-500">{recommendations.reason}</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recommendations.courses.map((course) => (
                <Link key={course.id} href={`/courses/${course.slug}`} className="rounded-xl">
                  <CourseCard
                    title={course.title}
                    category={course.category}
                    level={course.level}
                    durationLabel={formatCourseDuration(course)}
                    posterUrl={coursePosterUrl(course)}
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
