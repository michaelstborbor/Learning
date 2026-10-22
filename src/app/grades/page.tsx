import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import clsx from "clsx";
import { Nav } from "@/components/ui/Nav";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getCourseGrades } from "@/lib/gradebook";

export const metadata: Metadata = { title: "Grades" };

export default async function GradesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const enrolments = await prisma.enrolment.findMany({
    where: { learnerId: session.userId },
    include: { course: { select: { id: true, title: true } } },
    orderBy: { enrolledAt: "desc" },
  });

  const rows = await Promise.all(
    enrolments.map(async (enrolment) => {
      const { grades } = await getCourseGrades(enrolment.courseId, [session.userId]);
      return { enrolment, grade: grades.get(session.userId) };
    }),
  );

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-display text-3xl font-bold text-ink-900">Grades</h1>
        <p className="mt-1 text-ink-500">
          Your best score on every quiz and project. The course grade weights them the way your instructor set.
        </p>

        {rows.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No grades yet"
              description="Enrol in a course and take its quizzes to see your grades here."
              action={
                <Link href="/courses" className="text-sm font-medium text-brand-600 hover:underline">
                  Browse courses
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-5">
            {rows.map(({ enrolment, grade }) => (
              <section key={enrolment.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-raised">
                <div className="flex flex-wrap items-center gap-4">
                  <ProgressRing
                    value={grade?.currentPercent ?? 0}
                    size={72}
                    stroke={7}
                    label={grade?.currentPercent !== null && grade?.currentPercent !== undefined ? `Grade ${grade.currentPercent}%` : "No grade yet"}
                  >
                    <span className="font-display text-xl font-bold text-ink-900">{grade?.letter ?? "–"}</span>
                  </ProgressRing>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-semibold text-ink-900">
                      <Link href={`/learn/${enrolment.courseId}`} className="hover:text-brand-600 hover:underline">
                        {enrolment.course.title}
                      </Link>
                    </h2>
                    <p className="text-sm text-ink-500">
                      {grade?.currentPercent !== null && grade?.currentPercent !== undefined
                        ? `${grade.currentPercent}% so far · ${grade.gradedCount} of ${grade.items.length} assessments graded`
                        : grade && grade.items.length > 0
                          ? `${grade.items.length} assessments waiting for you`
                          : "This course has no graded assessments"}
                      {" · "}
                      {enrolment.progressPercent}% of lessons done
                    </p>
                  </div>
                </div>

                {grade && grade.items.length > 0 && (
                  <ul className="mt-4 divide-y divide-ink-100 border-t border-ink-100">
                    {grade.items.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 py-2.5 text-sm">
                        <Icon
                          name={item.kind === "quiz" ? "quiz" : "briefcase"}
                          size={18}
                          className={item.kind === "quiz" ? "text-highlight-500" : "text-verified-500"}
                        />
                        <span className="flex-1 text-ink-900">
                          {item.kind === "quiz" ? (
                            <Link href={`/learn/${enrolment.courseId}/quiz/${item.id}`} className="hover:underline">
                              {item.title}
                            </Link>
                          ) : (
                            <Link href={`/learn/${enrolment.courseId}/project`} className="hover:underline">
                              {item.title}
                            </Link>
                          )}
                        </span>
                        <span className="text-xs text-ink-400">weight {item.weight}</span>
                        <span
                          className={clsx(
                            "w-24 text-right tabular-nums",
                            item.passed ? "font-semibold text-brand-700" : "text-ink-700",
                          )}
                        >
                          {item.score === null ? (item.attempts ? "Awaiting grade" : "Not started") : `${item.score}%`}
                          {item.passed && <span className="sr-only"> passed</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
