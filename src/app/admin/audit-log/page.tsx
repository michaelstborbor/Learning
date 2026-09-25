import { redirect } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PUBLISH_ROLES } from "@/lib/roles";

export default async function AuditLogPage() {
  const session = await requireRole(PUBLISH_ROLES);
  if (!session) redirect("/login");

  const entries = await prisma.adminAuditLog.findMany({
    include: { actor: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">Audit log</h1>
        <p className="mt-1 text-ink-500">
          The most recent 100 administrative actions — role changes, activation
          changes, course publishing/archiving, and review decisions. Certificate
          issuance and revocation have their own trail; see{" "}
          <a href="/admin/certificates" className="text-brand-600 hover:underline">
            Certificates
          </a>
          .
        </p>

        {entries.length === 0 ? (
          <div className="mt-8">
            <EmptyState title="No entries yet" description="Actions will appear here as they happen." />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
            {entries.map((entry: any) => (
              <Card key={entry.id} className="text-sm">
                <p className="font-medium text-ink-900">
                  {entry.action.replaceAll("_", " ")}
                </p>
                <p className="text-xs text-ink-500">
                  {entry.actor.fullName} · {entry.targetType} {entry.targetId} ·{" "}
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
                {entry.notes && <p className="mt-1 text-xs text-ink-500">{entry.notes}</p>}
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
