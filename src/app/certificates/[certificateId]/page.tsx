import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/Nav";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { CertificatePreview } from "@/components/certificates/CertificatePreview";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { appBaseUrl } from "@/lib/app-url";
import { verifyUrl } from "@/lib/certificate-links";

export const metadata: Metadata = { title: "Your certificate" };

export default async function CertificatePage({ params }: { params: Promise<{ certificateId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { certificateId } = await params;
  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: {
      learner: { select: { fullName: true } },
      course: { select: { id: true, title: true, instructorId: true } },
    },
  });
  if (!certificate) notFound();
  const isOwner = certificate.learnerId === session.userId;
  if (!isOwner && !canManageCourse(session, certificate.course.instructorId)) notFound();

  const link = verifyUrl(appBaseUrl(), certificate.certificateNumber);
  const active = certificate.status === "ACTIVE";

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/certificates" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          <Icon name="chevronLeft" size={16} /> All certificates
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
              {isOwner ? "Your certificate" : `${certificate.learner.fullName}'s certificate`}
            </h1>
            <p className="mt-1 text-ink-500">{certificate.course.title}</p>
          </div>
          {active && (
            <a
              href={`/api/certificates/${certificate.id}/pdf`}
              download
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-action-500 px-5 text-sm font-semibold text-white shadow-[0_6px_16px_-8px_rgb(194_65_12/0.7)] hover:bg-action-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-600"
            >
              <Icon name="download" size={18} /> Download PDF (A4)
            </a>
          )}
        </div>

        {!active && (
          <div className="mt-6">
            <Alert tone="danger" title="This certificate was revoked">
              It no longer counts as proof of completion, so it can&apos;t be downloaded.
            </Alert>
          </div>
        )}

        <div className={active ? "mt-6" : "mt-6 opacity-50 grayscale"}>
          <CertificatePreview
            certificateNumber={certificate.certificateNumber}
            learnerName={certificate.learner.fullName}
            courseTitle={certificate.course.title}
            completedAt={certificate.issuedAt}
            verifyUrl={link}
          />
        </div>

        <section className="mt-6 rounded-xl border border-ink-100 bg-white p-5 shadow-raised">
          <h2 className="font-display text-base font-semibold text-ink-900">Checking this certificate</h2>
          <p className="mt-1 text-sm text-ink-500">
            Employers can confirm it&apos;s genuine by scanning the QR code on the certificate or entering
            the ID <span className="font-semibold text-ink-900">{certificate.certificateNumber}</span> on the
            verify page. No account is needed.
          </p>
          <Link
            href={`/verify?id=${encodeURIComponent(certificate.certificateNumber)}`}
            className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline"
          >
            Open the verify page
          </Link>
        </section>
      </main>
    </>
  );
}
