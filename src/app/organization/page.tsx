import { redirect } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ORGANIZATION_ROLES } from "@/lib/roles";
import { CreateOrganizationForm } from "@/components/organizations/CreateOrganizationForm";
import { CreateCohortForm } from "@/components/organizations/CreateCohortForm";
import { CreateOpportunityForm } from "@/components/organizations/CreateOpportunityForm";

export default async function OrganizationDashboardPage() {
  const session = await requireRole(ORGANIZATION_ROLES);
  if (!session) redirect("/login");

  const organization = await prisma.organization.findUnique({
    where: { ownerId: session.userId },
    include: {
      cohorts: { include: { course: true, members: true }, orderBy: { createdAt: "desc" } },
      opportunities: { include: { applications: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!organization) {
    return (
      <>
        <Nav />
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
          <CreateOrganizationForm />
        </main>
      </>
    );
  }

  const publishedCourses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true },
  });

  // Aggregate stats across every cohort (Stage F3) — built from the same
  // per-cohort member/course pairs the individual cohort dashboard reads,
  // not a separate precomputed summary.
  interface Membership {
    learnerId: string;
    courseId: string;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
  const allMemberships: Membership[] = organization.cohorts.flatMap((cohort: any) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
    cohort.members.map((m: any) => ({ learnerId: m.learnerId, courseId: cohort.courseId })),
  );
  const uniqueEmployeeCount = new Set(allMemberships.map((m: Membership) => m.learnerId)).size;

  const progressResults = await Promise.all(
    allMemberships.map(({ learnerId, courseId }: Membership) =>
      prisma.enrolment.findUnique({
        where: { learnerId_courseId: { learnerId, courseId } },
        select: { progressPercent: true },
      }),
    ),
  );
  const completedCount = progressResults.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
    (e: any) => e && e.progressPercent === 100,
  ).length;
  const orgCompletionRate =
    progressResults.length > 0 ? Math.round((completedCount / progressResults.length) * 100) : 0;

  const orgCertificateCount = allMemberships.length
    ? await prisma.certificate.count({
        where: {
          status: "ACTIVE",
          OR: allMemberships.map(({ learnerId, courseId }: Membership) => ({ learnerId, courseId })),
        },
      })
    : 0;

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">{organization.name}</h1>
        <p className="mt-1 text-ink-500">{organization.description}</p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Card className="flex flex-col gap-1">
            <p className="font-display text-xl font-bold text-ink-900">{uniqueEmployeeCount}</p>
            <p className="text-xs text-ink-500">Employees trained</p>
          </Card>
          <Card className="flex flex-col gap-1">
            <p className="font-display text-xl font-bold text-ink-900">{orgCompletionRate}%</p>
            <p className="text-xs text-ink-500">Completion rate</p>
          </Card>
          <Card className="flex flex-col gap-1">
            <p className="font-display text-xl font-bold text-ink-900">{orgCertificateCount}</p>
            <p className="text-xs text-ink-500">Certificates issued</p>
          </Card>
        </div>

        <section className="mt-10 border-t border-ink-100 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">Cohorts</h2>
            <CreateCohortForm organizationId={organization.id} courses={publishedCourses} />
          </div>
          {organization.cohorts.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No cohorts yet"
                description="Create a cohort to enrol a group of employees in a course together."
              />
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
              {organization.cohorts.map((cohort: any) => (
                <Link key={cohort.id} href={`/organization/cohorts/${cohort.id}`}>
                  <Card className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink-900">{cohort.title}</p>
                      <p className="text-xs text-ink-500">{cohort.course.title}</p>
                    </div>
                    <Badge tone="brand">
                      {cohort.members.length} learner{cohort.members.length === 1 ? "" : "s"}
                    </Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 border-t border-ink-100 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">Opportunities</h2>
            <CreateOpportunityForm organizationId={organization.id} />
          </div>
          {organization.opportunities.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No opportunities posted yet"
                description="Post an internship, job, or mentorship for learners to apply to."
              />
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
              {organization.opportunities.map((opportunity: any) => (
                <Link key={opportunity.id} href={`/organization/opportunities/${opportunity.id}`}>
                  <Card className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink-900">{opportunity.title}</p>
                      <p className="text-xs text-ink-500">
                        {opportunity.type.charAt(0) + opportunity.type.slice(1).toLowerCase()}
                      </p>
                    </div>
                    <Badge tone="brand">
                      {opportunity.applications.length} applicant
                      {opportunity.applications.length === 1 ? "" : "s"}
                    </Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
