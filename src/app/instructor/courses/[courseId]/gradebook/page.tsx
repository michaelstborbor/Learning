import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/Nav";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { getCourseGrades } from "@/lib/gradebook";

export const metadata: Metadata = { title: "Gradebook" };

function ScoreCell({ score, passed, attempts }: { score: number | null; passed: boolean; attempts: number }) {
  if (score === null) {
    return <span className="text-ink-400">{attempts > 0 ? "Pending" : "Not started"}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      <span className={passed ? "font-semibold text-verified-700" : "text-ink-900"}>{score}%</span>
      {passed && <Icon name="check" size={14} className="text-verified-500" label="Passed" />}
      {attempts > 1 && <span className="text-xs text-ink-400">×{attempts}</span>}
    </span>
  );
}

export default async function GradebookPage({ params }: { params: Promise<{ courseId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, instructorId: true },
  });
  if (!course) notFound();
  if (!canManageCourse(session, course.instructorId)) redirect("/instructor/courses");

  const enrolments = await prisma.enrolment.findMany({
    where: { courseId },
    include: { learner: { select: { id: true, fullName: true, email: true } } },
    orderBy: { enrolledAt: "asc" },
  });
  const { quizzes, project, grades } = await getCourseGrades(
    courseId,
    enrolments.map((e) => e.learnerId),
  );

  const columns = [
    ...quizzes.map((q) => ({ id: q.id, title: q.title, weight: q.weight })),
    ...(project ? [{ id: project.id, title: project.title, weight: project.weight }] : []),
  ];

  const averages = columns.map((col) => {
    const scores = enrolments
      .map((e) => grades.get(e.learnerId)?.items.find((i) => i.id === col.id)?.score)
      .filter((s): s is number => typeof s === "number");
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  });

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href={`/instructor/courses/${course.id}`}
          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
        >
          <Icon name="chevronLeft" size={16} /> {course.title}
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink-900">Gradebook</h1>
            <p className="mt-1 text-sm text-ink-500">
              Best score per assessment. The course grade weights each one as set on the course page.
            </p>
          </div>
          {enrolments.length > 0 && (
            <a
              href={`/api/courses/${course.id}/gradebook`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand-400 bg-white px-4 text-sm font-semibold text-brand-600 hover:bg-brand-50"
            >
              <Icon name="download" size={18} /> Download CSV
            </a>
          )}
        </div>

        {enrolments.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No learners enrolled yet"
              description="Grades appear here as soon as learners enrol and submit quizzes or projects."
            />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-ink-100 bg-white shadow-raised">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-ink-100 bg-ink-50 text-xs text-ink-500">
                <tr>
                  <th scope="col" className="sticky left-0 bg-ink-50 px-4 py-3 font-semibold">
                    Learner
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">Lessons</th>
                  {columns.map((col) => (
                    <th key={col.id} scope="col" className="px-4 py-3 font-semibold">
                      {col.title}
                      <span className="block font-normal text-ink-400">weight {col.weight}</span>
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3 font-semibold">Course grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {enrolments.map((enrolment) => {
                  const grade = grades.get(enrolment.learnerId);
                  return (
                    <tr key={enrolment.id} className="hover:bg-brand-50/40">
                      <th scope="row" className="sticky left-0 bg-white px-4 py-3 font-medium text-ink-900">
                        {enrolment.learner.fullName}
                        <span className="block text-xs font-normal text-ink-500">{enrolment.learner.email}</span>
                      </th>
                      <td className="px-4 py-3 tabular-nums text-ink-700">{enrolment.progressPercent}%</td>
                      {columns.map((col) => {
                        const item = grade?.items.find((i) => i.id === col.id);
                        return (
                          <td key={col.id} className="px-4 py-3">
                            <ScoreCell score={item?.score ?? null} passed={item?.passed ?? false} attempts={item?.attempts ?? 0} />
                          </td>
                        );
                      })}
                      <td className="px-4 py-3">
                        {grade?.currentPercent !== null && grade?.currentPercent !== undefined ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 font-display font-bold text-white">
                              {grade.letter}
                            </span>
                            <span className="tabular-nums text-ink-900">{grade.currentPercent}%</span>
                          </span>
                        ) : (
                          <span className="text-ink-400">No grade yet</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-ink-100 bg-ink-50 text-xs text-ink-500">
                <tr>
                  <th scope="row" className="sticky left-0 bg-ink-50 px-4 py-3 font-semibold">
                    Class average
                  </th>
                  <td className="px-4 py-3" />
                  {averages.map((avg, i) => (
                    <td key={columns[i].id} className="px-4 py-3 tabular-nums">
                      {avg === null ? "None yet" : `${avg}%`}
                    </td>
                  ))}
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
