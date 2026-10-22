import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { getCourseGrades } from "@/lib/gradebook";
import { certificateEligibility } from "@/lib/certificate-eligibility";

// No 0/O or 1/I, so a number read out or typed in by hand can't be misread.
const CERTIFICATE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

// Unguessable (crypto-random, 50 bits), so nobody can find other people's
// certificates on the public verify page by trying numbers.
export function generateCertificateNumber(): string {
  const bytes = randomBytes(10);
  let random = "";
  for (const byte of bytes) random += CERTIFICATE_ALPHABET[byte % 32];
  return `ESA-${random}`;
}

/**
 * Checks whether a learner has earned a course's certificate, and issues
 * one if so and one doesn't already exist. Returns the learner's
 * certificate (new or existing), or null when they don't qualify yet.
 *
 * Called after every event that could complete the criteria (lesson
 * completion, a quiz attempt, a project grade) and when the learner
 * presses "Get your certificate". This is intentionally the ONLY place a
 * Certificate row gets created, so "what counts as earning a certificate"
 * lives in one auditable function, not scattered across route handlers.
 *
 * Criteria (see certificate-eligibility.ts): every quiz, the final quiz and
 * the project have a score, and the weighted course grade is at least 70%.
 * A course with no assessments certifies once every lesson is complete.
 */
export async function maybeIssueCertificate(learnerId: string, courseId: string) {
  const existing = await prisma.certificate.findUnique({
    where: { learnerId_courseId: { learnerId, courseId } },
  });
  // Deliberately don't re-issue over a revoked certificate automatically:
  // a revocation was a human decision (Rule 5) and shouldn't be silently
  // undone by the learner re-triggering an event.
  if (existing) return existing;

  const [course, enrolment] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId } }),
    prisma.enrolment.findUnique({
      where: { learnerId_courseId: { learnerId, courseId } },
    }),
  ]);
  if (!course || !enrolment) return null;

  const { grades } = await getCourseGrades(courseId, [learnerId]);
  const eligibility = certificateEligibility(grades.get(learnerId), enrolment.progressPercent);
  if (eligibility.status !== "qualified") return null;

  // Guard against a slim race (e.g. two events firing near-simultaneously)
  // on the unique certificate number rather than assuming single-writer.
  let certificateNumber = generateCertificateNumber();
  while (await prisma.certificate.findUnique({ where: { certificateNumber } })) {
    certificateNumber = generateCertificateNumber();
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const certificate = await tx.certificate.create({
        data: {
          certificateNumber,
          learnerId,
          courseId,
          competencyStatement: `Successfully completed ${course.title}.`,
        },
      });
      await tx.certificateAuditLog.create({
        data: {
          certificateId: certificate.id,
          action: "ISSUED",
          performedById: null,
          notes:
            eligibility.percent === null
              ? "Issued automatically on completing every lesson."
              : `Issued automatically on reaching a course grade of ${eligibility.percent}%.`,
        },
      });
      return certificate;
    });
  } catch (error) {
    // Two requests raced and the other one issued it: hand that one back.
    const raced = await prisma.certificate.findUnique({
      where: { learnerId_courseId: { learnerId, courseId } },
    });
    if (raced) return raced;
    throw error;
  }
}
