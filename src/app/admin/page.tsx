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

export default async function AdminDashboardPage() {
  const session = await requireRole(PUBLISH_ROLES);
  if (!session) redirect("/login");

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
    completedEnrolments,
    allQuizAttempts,
    topCourses,
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
    prisma.enrolment.count({ where: { progressPercent: 100 } }),
    prisma.quizAttempt.findMany({ select: { passed: true } }),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      include: { _count: { select: { enrolments: true } } },
      orderBy: { enrolments: { _count: "desc" } },
      take: 5,
    }),
  ]);

  const completionRate =
    totalEnrolments > 0 ? Math.round((completedEnrolments / totalEnrolments) * 100) : 0;
  const quizPassRate =
    allQuizAttempts.length > 0
      ? Math.round(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
          (allQuizAttempts.filter((a: any) => a.passed).length / allQuizAttempts.length) * 100,
        )
      : null;

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
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

        <section className="mt-10 border-t border-ink-100 pt-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">
            Learning performance
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card className="flex flex-col gap-1">
              <p className="font-display text-xl font-bold text-ink-900">{totalEnrolments}</p>
              <p className="text-xs text-ink-500">Total enrolments</p>
            </Card>
            <Card className="flex flex-col gap-1">
              <p className="font-display text-xl font-bold text-ink-900">{completionRate}%</p>
              <p className="text-xs text-ink-500">Overall completion rate</p>
            </Card>
            <Card className="flex flex-col gap-1">
              <p className="font-display text-xl font-bold text-ink-900">
                {quizPassRate === null ? "—" : `${quizPassRate}%`}
              </p>
              <p className="text-xs text-ink-500">Overall quiz pass rate</p>
            </Card>
          </div>
        </section>

        {topCourses.length > 0 && (
          <section className="mt-10 border-t border-ink-100 pt-6">
            <h2 className="font-display text-lg font-semibold text-ink-900">
              Most popular courses
            </h2>
            <div className="mt-4 flex flex-col gap-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
              {topCourses.map((course: any) => (
                <Link key={course.id} href={`/instructor/courses/${course.id}`}>
                  <Card className="flex items-center justify-between">
                    <p className="font-medium text-ink-900">{course.title}</p>
                    <p className="text-sm text-ink-500">{course._count.enrolments} enrolled</p>
                  </Card>
                </Link>
              ))}
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
