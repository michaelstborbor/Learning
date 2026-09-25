import { redirect } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const STATUS_TONE: Record<string, "brand" | "verified" | "danger" | "neutral"> = {
  APPLIED: "neutral",
  SHORTLISTED: "brand",
  INTERVIEW: "brand",
  SELECTED: "verified",
  REJECTED: "danger",
};

export default async function ApplicationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const applications = await prisma.application.findMany({
    where: { learnerId: session.userId },
    include: { opportunity: { include: { organization: { select: { name: true } } } } },
    orderBy: { appliedAt: "desc" },
  });

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">Your applications</h1>

        {applications.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No applications yet"
              description="Browse open opportunities and apply — organizations review applications here."
            />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
            {applications.map((application: any) => (
              <Card key={application.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink-900">{application.opportunity.title}</p>
                  <p className="text-sm text-ink-500">{application.opportunity.organization.name}</p>
                </div>
                <Badge tone={STATUS_TONE[application.status] ?? "neutral"}>
                  {application.status.charAt(0) + application.status.slice(1).toLowerCase()}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
