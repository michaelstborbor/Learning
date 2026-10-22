import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimitOrNull } from "@/lib/rate-limit";

// Deliberately public (no getSession check) — certificate verification has
// to work for anyone, including an employer with no EliteSkills Academy
// account. Deliberately returns minimal data: enough to confirm
// authenticity (name, course, date, status), nothing else about the
// learner. A revoked certificate is reported as revoked, not hidden as
// "not found" — a real verifier deserves the true status, not silence
// (see PHASE0_BLUEPRINT.md Section 60: "Can certificates be independently
// verified?").
export async function GET(
  request: Request,
  { params }: { params: Promise<{ certificateNumber: string }> },
) {
  // Plenty for a real employer checking a few certificates, too few to
  // sweep through numbers looking for other people's.
  const limited = await rateLimitOrNull(request, "verify", { limit: 30, windowSeconds: 60 });
  if (limited) return limited;

  const { certificateNumber } = await params;
  if (certificateNumber.length > 40) {
    return NextResponse.json({ error: "No certificate found with that ID." }, { status: 404 });
  }

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
