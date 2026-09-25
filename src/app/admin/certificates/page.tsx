import { redirect } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PUBLISH_ROLES } from "@/lib/roles";
import { RevokeButton } from "@/components/certificates/RevokeButton";

export default async function AdminCertificatesPage() {
  const session = await requireRole(PUBLISH_ROLES);
  if (!session) redirect("/login");

  const certificates = await prisma.certificate.findMany({
    include: {
      learner: { select: { fullName: true } },
      course: { select: { title: true } },
      auditLog: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Certificates
        </h1>
        <p className="mt-1 text-ink-500">
          Issued automatically on completion. Revocation is manual and
          always requires a reason, recorded in the audit trail below.
        </p>

        {certificates.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No certificates issued yet"
              description="Certificates appear here as learners complete certificate-eligible courses."
            />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
            {certificates.map((certificate: any) => (
              <Card key={certificate.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink-900">
                      {certificate.learner.fullName} — {certificate.course.title}
                    </p>
                    <p className="text-xs text-ink-500">
                      {certificate.certificateNumber} · Issued{" "}
                      {new Date(certificate.issuedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge tone={certificate.status === "ACTIVE" ? "verified" : "danger"}>
                    {certificate.status === "ACTIVE" ? "Active" : "Revoked"}
                  </Badge>
                </div>

                <details className="text-xs text-ink-500">
                  <summary className="cursor-pointer text-brand-600 hover:underline">
                    Audit trail ({certificate.auditLog.length})
                  </summary>
                  <ul className="mt-2 flex flex-col gap-1">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
                    {certificate.auditLog.map((entry: any) => (
                      <li key={entry.id}>
                        {entry.action} — {new Date(entry.createdAt).toLocaleString()}
                        {entry.notes && `: ${entry.notes}`}
                      </li>
                    ))}
                  </ul>
                </details>

                {certificate.status === "ACTIVE" && (
                  <div>
                    <RevokeButton certificateId={certificate.id} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
