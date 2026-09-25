import { redirect, notFound } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageOrganization } from "@/lib/permissions";
import { AddCohortMemberForm } from "@/components/organizations/AddCohortMemberForm";
import { AttendanceForm } from "@/components/organizations/AttendanceForm";

export default async function CohortDetailPage({
  params,
}: {
  params: Promise<{ cohortId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { cohortId } = await params;
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    include: {
      course: true,
      organization: true,
      members: { include: { learner: true }, orderBy: { joinedAt: "asc" } },
    },
  });
  if (!cohort || !cohort.organization) notFound();
  if (!canManageOrganization(session, cohort.organization.ownerId)) redirect("/organization");

  // Pull each member's real progress from the same Enrolment/QuizAttempt/
  // ProjectSubmission tables the learner-facing pages use — a cohort
  // dashboard, not a separate parallel tracking system.
  const memberProgress = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
    cohort.members.map(async (member: any) => {
      const enrolment = await prisma.enrolment.findUnique({
        where: {
          learnerId_courseId: { learnerId: member.learnerId, courseId: cohort.courseId },
        },
      });
      const certificate = await prisma.certificate.findUnique({
        where: {
          learnerId_courseId: { learnerId: member.learnerId, courseId: cohort.courseId },
        },
      });
      return {
        learnerId: member.learnerId,
        fullName: member.learner.fullName,
        progressPercent: enrolment?.progressPercent ?? 0,
        certified: Boolean(certificate && certificate.status === "ACTIVE"),
      };
    }),
  );

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">{cohort.title}</h1>
        <p className="mt-1 text-ink-500">
          {cohort.course.title} · {new Date(cohort.startDate).toLocaleDateString()} –{" "}
          {new Date(cohort.endDate).toLocaleDateString()}
          {cohort.location && ` · ${cohort.location}`}
        </p>

        <section className="mt-8">
          <AddCohortMemberForm cohortId={cohort.id} />
        </section>

        <section className="mt-8 border-t border-ink-100 pt-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">
            Learners ({memberProgress.length})
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {memberProgress.map((m) => (
              <Card key={m.learnerId} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-ink-900">{m.fullName}</p>
                  <ProgressBar value={m.progressPercent} />
                </div>
                {m.certified && <Badge tone="verified">Certified</Badge>}
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-8 border-t border-ink-100 pt-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">Attendance</h2>
          <div className="mt-4">
            <AttendanceForm
              cohortId={cohort.id}
              members={memberProgress.map((m) => ({ learnerId: m.learnerId, fullName: m.fullName }))}
            />
          </div>
        </section>
      </main>
    </>
  );
}
