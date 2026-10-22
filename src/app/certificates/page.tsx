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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Your certificates
        </h1>
        <p className="mt-1 text-ink-500">
          Earned when your course grade across the quizzes and the project
          reaches 70% or more. Each one downloads as an A4 PDF.
        </p>

        {certificates.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No certificates yet"
              description="Reach a course grade of 70% or more across a course's quizzes and project to earn one."
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
                    href={`/certificates/${certificate.id}`}
                    className="text-sm font-semibold text-brand-600 hover:underline"
                  >
                    {certificate.status === "ACTIVE" ? "View and download" : "View"}
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
