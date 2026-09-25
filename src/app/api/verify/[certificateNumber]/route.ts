import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Deliberately public (no getSession check) — certificate verification has
// to work for anyone, including an employer with no EcoSkills Academy
// account. Deliberately returns minimal data: enough to confirm
// authenticity (name, course, date, status), nothing else about the
// learner. A revoked certificate is reported as revoked, not hidden as
// "not found" — a real verifier deserves the true status, not silence
// (see PHASE0_BLUEPRINT.md Section 60: "Can certificates be independently
// verified?").
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ certificateNumber: string }> },
) {
  const { certificateNumber } = await params;

  const certificate = await prisma.certificate.findUnique({
    where: { certificateNumber },
    include: {
      learner: { select: { fullName: true } },
      course: { select: { title: true } },
    },
  });

  if (!certificate) {
    return NextResponse.json({ error: "No certificate found with that ID." }, { status: 404 });
  }

  return NextResponse.json({
    certificateNumber: certificate.certificateNumber,
    learnerName: certificate.learner.fullName,
    courseTitle: certificate.course.title,
    competencyStatement: certificate.competencyStatement,
    issuingPartner: certificate.issuingPartner,
    status: certificate.status,
    issuedAt: certificate.issuedAt.toISOString(),
  });
}
