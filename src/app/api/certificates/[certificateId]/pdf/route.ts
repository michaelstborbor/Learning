import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { appBaseUrl } from "@/lib/app-url";
import { renderCertificatePdf } from "@/lib/certificate-pdf";
import { verifyUrl } from "@/lib/certificate-links";

// The certificate as an A4 PDF, for the learner who earned it and for the
// people who run the course. Anyone else checks it on the public verify
// page with the certificate ID or the QR code printed on it.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ certificateId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { certificateId } = await params;
  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: {
      learner: { select: { fullName: true } },
      course: { select: { title: true, instructorId: true } },
    },
  });
  if (!certificate) return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
  if (certificate.learnerId !== session.userId && !canManageCourse(session, certificate.course.instructorId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (certificate.status !== "ACTIVE") {
    return NextResponse.json({ error: "This certificate was revoked, so it can't be downloaded." }, { status: 410 });
  }

  const pdf = await renderCertificatePdf({
    certificateNumber: certificate.certificateNumber,
    learnerName: certificate.learner.fullName,
    courseTitle: certificate.course.title,
    completedAt: certificate.issuedAt,
    verifyUrl: verifyUrl(appBaseUrl(), certificate.certificateNumber),
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `attachment; filename="EliteSkills-Certificate-${certificate.certificateNumber}.pdf"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
