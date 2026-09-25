import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/Nav";
import { Badge } from "@/components/ui/Badge";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ApplyPanel } from "@/components/organizations/ApplyPanel";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}): Promise<Metadata> {
  const { opportunityId } = await params;
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: { title: true, description: true, status: true },
  });
  if (!opportunity || opportunity.status !== "OPEN") {
    return { title: "Opportunity not found" };
  }
  return {
    title: opportunity.title,
    description: opportunity.description,
    openGraph: { title: opportunity.title, description: opportunity.description },
  };
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: { organization: { select: { name: true } } },
  });
  if (!opportunity || opportunity.status !== "OPEN") notFound();

  const session = await getSession();
  let alreadyApplied = false;
  if (session) {
    const existing = await prisma.application.findUnique({
      where: { opportunityId_learnerId: { opportunityId, learnerId: session.userId } },
    });
    alreadyApplied = Boolean(existing);
  }

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <Badge tone="brand">
          {opportunity.type.charAt(0) + opportunity.type.slice(1).toLowerCase()}
        </Badge>
        <h1 className="mt-3 font-display text-2xl font-bold text-ink-900">{opportunity.title}</h1>
        <p className="mt-1 text-ink-500">
          {opportunity.organization.name}
          {opportunity.location && ` · ${opportunity.location}`}
        </p>

        <p className="mt-6 whitespace-pre-wrap text-ink-700">{opportunity.description}</p>

        <div className="mt-4">
          <p className="font-medium text-ink-700">Who&apos;s eligible</p>
          <p className="mt-1 text-sm text-ink-500">{opportunity.eligibilityCriteria}</p>
        </div>

        <div className="mt-8">
          <ApplyPanel
            opportunityId={opportunity.id}
            isLoggedIn={Boolean(session)}
            alreadyApplied={alreadyApplied}
          />
        </div>
      </main>
    </>
  );
}
