import { redirect, notFound } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageOrganization } from "@/lib/permissions";
import { ApplicationStatusSelect } from "@/components/organizations/ApplicationStatusSelect";

export default async function OpportunityApplicantsPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { opportunityId } = await params;
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: {
      organization: true,
      applications: { include: { learner: true }, orderBy: { appliedAt: "asc" } },
    },
  });
  if (!opportunity) notFound();
  if (!canManageOrganization(session, opportunity.organization.ownerId)) redirect("/organization");

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">{opportunity.title}</h1>
        <p className="mt-1 text-ink-500">
          {opportunity.type.charAt(0) + opportunity.type.slice(1).toLowerCase()}
          {opportunity.location && ` · ${opportunity.location}`}
        </p>

        <section className="mt-8 border-t border-ink-100 pt-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">
            Applicants ({opportunity.applications.length})
          </h2>

          {opportunity.applications.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No applicants yet" description="Check back once learners start applying." />
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
              {opportunity.applications.map((application: any) => (
                <Card key={application.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-ink-900">{application.learner.fullName}</p>
                    <ApplicationStatusSelect applicationId={application.id} status={application.status} />
                  </div>
                  {application.coverNote && (
                    <p className="text-sm text-ink-500">{application.coverNote}</p>
                  )}
                  <p className="text-xs text-ink-300">
                    Applied {new Date(application.appliedAt).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
