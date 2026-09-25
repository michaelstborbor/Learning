import { redirect } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export default async function CertificatesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const certificates = await prisma.certificate.findMany({
    where: { learnerId: session.userId },
    include: { course: { select: { title: true } } },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Your certificates
        </h1>
        <p className="mt-1 text-ink-500">
          Issued automatically when you complete a course and pass its
          competency requirements.
        </p>

        {certificates.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No certificates yet"
              description="Complete a certificate-eligible course — including its quiz and practical project — to earn one."
            />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
            {certificates.map((certificate: any) => (
              <Card key={certificate.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink-900">{certificate.course.title}</p>
                  <p className="text-xs text-ink-500">
                    {certificate.certificateNumber} · Issued{" "}
                    {new Date(certificate.issuedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={certificate.status === "ACTIVE" ? "verified" : "danger"}>
                    {certificate.status === "ACTIVE" ? "Active" : "Revoked"}
                  </Badge>
                  <Link
                    href={`/verify?id=${certificate.certificateNumber}`}
                    className="text-sm text-brand-600 hover:underline"
                  >
                    View
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
