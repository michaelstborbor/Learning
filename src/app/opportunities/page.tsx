import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Opportunities",
  description: "Internships, jobs, and mentorships posted by organizations on EcoSkills Academy.",
};

// Opportunities change after deploy — never frozen as a static build-time
// snapshot (same reasoning as the course catalogue).
export const dynamic = "force-dynamic";

const TYPES = ["INTERNSHIP", "JOB", "APPRENTICESHIP", "VOLUNTEER", "PROJECT", "MENTORSHIP"] as const;
type OpportunityTypeValue = (typeof TYPES)[number];

function isOpportunityType(value: string | undefined): value is OpportunityTypeValue {
  return TYPES.includes(value as OpportunityTypeValue);
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q, type } = await searchParams;

  const opportunities = await prisma.opportunity.findMany({
    where: {
      status: "OPEN",
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(isOpportunityType(type) ? { type } : {}),
    },
    include: { organization: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const hasFilters = Boolean(q || type);

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">Opportunities</h1>
        <p className="mt-1 text-ink-500">
          Internships, jobs, and mentorships posted by organizations on EcoSkills Academy.
        </p>

        <form method="GET" className="mt-6 flex flex-wrap gap-3">
          <input
            type="text"
            name="q"
            placeholder="Search opportunities…"
            defaultValue={q}
            className="min-w-48 flex-1 rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
          />
          <select
            name="type"
            defaultValue={type ?? ""}
            className="rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
          >
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-action-500 px-4 py-2 text-sm font-medium text-white hover:bg-action-600"
          >
            Search
          </button>
          {hasFilters && (
            <Link
              href="/opportunities"
              className="flex items-center text-sm text-ink-500 hover:text-ink-700"
            >
              Clear
            </Link>
          )}
        </form>

        {opportunities.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={hasFilters ? "No opportunities match your search" : "No opportunities posted yet"}
              description={
                hasFilters
                  ? "Try a different search term or clear the filters."
                  : "Check back soon — organizations post internships, jobs, and mentorships here."
              }
            />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
            {opportunities.map((opportunity: any) => (
              <Link key={opportunity.id} href={`/opportunities/${opportunity.id}`}>
                <Card className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink-900">{opportunity.title}</p>
                    <p className="text-sm text-ink-500">
                      {opportunity.organization.name}
                      {opportunity.location && ` · ${opportunity.location}`}
                    </p>
                  </div>
                  <Badge tone="brand">
                    {opportunity.type.charAt(0) + opportunity.type.slice(1).toLowerCase()}
                  </Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
