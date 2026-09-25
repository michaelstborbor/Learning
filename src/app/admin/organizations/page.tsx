import { redirect } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PUBLISH_ROLES } from "@/lib/roles";

export default async function AdminOrganizationsPage() {
  const session = await requireRole(PUBLISH_ROLES);
  if (!session) redirect("/login");

  const organizations = await prisma.organization.findMany({
    include: {
      owner: { select: { fullName: true, email: true } },
      cohorts: true,
      opportunities: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">Organizations</h1>
        <p className="mt-1 text-ink-500">Every organization registered on the platform.</p>

        {organizations.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No organizations yet"
              description="Organizations appear here once a user with the Organization role creates a profile."
            />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
            {organizations.map((org: any) => (
              <Card key={org.id} className="flex flex-col gap-1">
                <p className="font-medium text-ink-900">{org.name}</p>
                <p className="text-xs text-ink-500">
                  {org.owner.fullName} · {org.owner.email}
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  {org.cohorts.length} cohort{org.cohorts.length === 1 ? "" : "s"} ·{" "}
                  {org.opportunities.length} opportunit
                  {org.opportunities.length === 1 ? "y" : "ies"}
                </p>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
