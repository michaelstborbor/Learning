import { redirect } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PUBLISH_ROLES } from "@/lib/roles";

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href}>
      <Card className="flex flex-col gap-1">
        <p className="font-display text-2xl font-bold text-ink-900">{value}</p>
        <p className="text-sm text-ink-500">{label}</p>
      </Card>
    </Link>
  );
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function Metric({ value, label }: { value: number | string; label: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="font-display text-xl font-bold tabular-nums text-ink-900">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const session = await requireRole(PUBLISH_ROLES);
  if (!session) redirect("/login");

  const since7 = daysAgo(7);
  const since30 = daysAgo(30);

  // Everything below is counted from the platform's own tables and shown
  // only as totals: no individual learner is identifiable on this page.
  const [
    totalUsers,
    activeLearners,
    totalCourses,
    publishedCourses,
    coursesUnderReview,
    activeCertificates,
    totalOrganizations,
    openOpportunities,
    totalEnrolments,
    startedEnrolments,
    completedEnrolments,
    submittedAttempts,
    passedAttempts,
    topCourses,
    learnersActive7,
    learnersActive30,
    lessonsDone7,
    newSignups30,
    tutorQuestions7,
    certificates30,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "LEARNER", isActive: true } }),
    prisma.course.count(),
    prisma.course.count({ where: { status: "PUBLISHED" } }),
    prisma.course.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.certificate.count({ where: { status: "ACTIVE" } }),
    prisma.organization.count(),
    prisma.opportunity.count({ where: { status: "OPEN" } }),
    prisma.enrolment.count(),
    prisma.enrolment.count({ where: { progressPercent: { gt: 0 } } }),
    prisma.enrolment.count({ where: { progressPercent: 100 } }),
    prisma.quizAttempt.count({ where: { status: "SUBMITTED" } }),
    prisma.quizAttempt.count({ where: { status: "SUBMITTED", passed: true } }),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, _count: { select: { enrolments: true } } },
      orderBy: { enrolments: { _count: "desc" } },
      take: 8,
    }),
    prisma.lessonProgress.groupBy({ by: ["learnerId"], where: { completedAt: { gte: since7 } } }),
    prisma.lessonProgress.groupBy({ by: ["learnerId"], where: { completedAt: { gte: since30 } } }),
    prisma.lessonProgress.count({ where: { completedAt: { gte: since7 } } }),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.tutorMessage.count({ where: { role: "USER", createdAt: { gte: since7 } } }),
    prisma.certificate.count({ where: { issuedAt: { gte: since30 } } }),
  ]);

  // Per-course funnel for the most popular courses: enrolled -> started ->
  // finished, to spot where learners stall.
  const topIds = topCourses.map((c) => c.id);
  const [startedByCourse, finishedByCourse] = await Promise.all([
    prisma.enrolment.groupBy({
      by: ["courseId"],
      where: { courseId: { in: topIds }, progressPercent: { gt: 0 } },
      _count: { _all: true },
    }),
    prisma.enrolment.groupBy({
      by: ["courseId"],
      where: { courseId: { in: topIds }, progressPercent: 100 },
      _count: { _all: true },
    }),
  ]);
  const started = new Map(startedByCourse.map((r) => [r.courseId, r._count._all]));
  const finished = new Map(finishedByCourse.map((r) => [r.courseId, r._count._all]));
  const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

  const completionRate = percent(completedEnrolments, totalEnrolments);
  const startRate = percent(startedEnrolments, totalEnrolments);
  const quizPassRate = submittedAttempts > 0 ? percent(passedAttempts, submittedAttempts) : null;

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">Admin dashboard</h1>
        <p className="mt-1 text-ink-500">Platform-wide overview.</p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Total users" value={totalUsers} href="/admin/users" />
          <StatCard label="Active learners" value={activeLearners} href="/admin/users" />
          <StatCard
            label={`Courses (${publishedCourses} published)`}
            value={totalCourses}
            href="/instructor/courses"
          />
          <StatCard label="Awaiting review" value={coursesUnderReview} href="/review" />
          <StatCard label="Active certificates" value={activeCertificates} href="/admin/certificates" />
          <StatCard label="Organizations" value={totalOrganizations} href="/admin/organizations" />
          <StatCard label="Open opportunities" value={openOpportunities} href="/opportunities" />
        </div>

        <section className="mt-10 border-t border-ink-100 pt-6" aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="font-display text-lg font-semibold text-ink-900">
            Learning activity
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Totals only, counted from course progress. Page traffic is in Vercel Web Analytics.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric value={learnersActive7.length} label="Learners active, last 7 days" />
            <Metric value={learnersActive30.length} label="Learners active, last 30 days" />
            <Metric value={lessonsDone7} label="Lessons completed, last 7 days" />
            <Metric value={newSignups30} label="New sign-ups, last 30 days" />
            <Metric value={tutorQuestions7} label="Study buddy questions, last 7 days" />
            <Metric value={certificates30} label="Certificates issued, last 30 days" />
          </div>
        </section>

        <section className="mt-10 border-t border-ink-100 pt-6" aria-labelledby="performance-heading">
          <h2 id="performance-heading" className="font-display text-lg font-semibold text-ink-900">
            Learning performance
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric value={totalEnrolments} label="Total enrolments" />
            <Metric value={`${startRate}%`} label="Started at least one lesson" />
            <Metric value={`${completionRate}%`} label="Finished the course" />
            <Metric value={quizPassRate === null ? "—" : `${quizPassRate}%`} label="Quiz attempts passed" />
          </div>
        </section>

        {topCourses.length > 0 && (
          <section className="mt-10 border-t border-ink-100 pt-6" aria-labelledby="courses-heading">
            <h2 id="courses-heading" className="font-display text-lg font-semibold text-ink-900">
              Most popular courses
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              A big gap between enrolled and started usually means the first lesson needs work.
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-ink-100 bg-white">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-ink-50 text-xs text-ink-500">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">Course</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">Enrolled</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">Started</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">Finished</th>
                  </tr>
                </thead>
                <tbody>
                  {topCourses.map((course) => {
                    const enrolled = course._count.enrolments;
                    const s = started.get(course.id) ?? 0;
                    const f = finished.get(course.id) ?? 0;
                    return (
                      <tr key={course.id} className="border-t border-ink-100">
                        <td className="px-4 py-2.5">
                          <Link href={`/instructor/courses/${course.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                            {course.title}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{enrolled}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {s} <span className="text-ink-500">({percent(s, enrolled)}%)</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {f} <span className="text-ink-500">({percent(f, enrolled)}%)</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="mt-10 flex flex-wrap gap-3 border-t border-ink-100 pt-6">
          <Link href="/admin/users" className="text-sm font-medium text-brand-600 hover:underline">
            Manage users →
          </Link>
          <Link href="/instructor/courses" className="text-sm font-medium text-brand-600 hover:underline">
            Manage courses →
          </Link>
          <Link href="/admin/certificates" className="text-sm font-medium text-brand-600 hover:underline">
            Manage certificates →
          </Link>
          <Link href="/admin/organizations" className="text-sm font-medium text-brand-600 hover:underline">
            View organizations →
          </Link>
          <Link href="/review" className="text-sm font-medium text-brand-600 hover:underline">
            Review queue →
          </Link>
          <Link href="/admin/audit-log" className="text-sm font-medium text-brand-600 hover:underline">
            Audit log →
          </Link>
        </div>
      </main>
    </>
  );
}
