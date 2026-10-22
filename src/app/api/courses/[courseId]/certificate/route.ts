import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { maybeIssueCertificate } from "@/lib/certificates";
import { CERTIFICATE_PASS_PERCENT } from "@/lib/certificate-eligibility";

// "Get your certificate": issues the learner's certificate if they qualify
// (or returns the one they already have). Issuing is idempotent, so
// pressing the button twice never creates two certificates.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { courseId } = await params;
  const enrolment = await prisma.enrolment.findUnique({
    where: { learnerId_courseId: { learnerId: session.userId, courseId } },
  });
  if (!enrolment) {
    return NextResponse.json({ error: "You need to enrol in this course first." }, { status: 403 });
  }

  const certificate = await maybeIssueCertificate(session.userId, courseId);
  if (!certificate) {
    return NextResponse.json(
      {
        error: `You are not qualified to get a certificate now. You need a course grade of ${CERTIFICATE_PASS_PERCENT}% or more across the quizzes and the project.`,
      },
      { status: 403 },
    );
  }
  if (certificate.status !== "ACTIVE") {
    return NextResponse.json({ error: "Your certificate for this course was revoked." }, { status: 410 });
  }
  return NextResponse.json({ id: certificate.id, certificateNumber: certificate.certificateNumber });
}
