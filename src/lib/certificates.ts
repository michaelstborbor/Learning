import { prisma } from "@/lib/db";

function generateCertificateNumber(): string {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `ESA-${random}`;
}

/**
 * Checks whether a learner has met a course's real completion + competency
 * criteria, and issues a certificate if so and one doesn't already exist.
 *
 * Called after every event that could complete the criteria — lesson
 * completion, a passing quiz attempt, a passing project grade — rather than
 * from a single place, because any of the three could be the final piece.
 * This is intentionally the ONLY place a Certificate row gets created, so
 * "what counts as earning a certificate" lives in one auditable function,
 * not scattered across route handlers.
 *
 * Criteria: 100% lesson progress, AND a passed QuizAttempt if the course
 * has a quiz, AND a passing graded ProjectSubmission if the course has a
 * project. A course with neither assessment certifies on completion alone
 * — most courses are expected to have at least one, but the check doesn't
 * assume it.
 */
export async function maybeIssueCertificate(
  learnerId: string,
  courseId: string,
): Promise<void> {
  const existing = await prisma.certificate.findUnique({
    where: { learnerId_courseId: { learnerId, courseId } },
  });
  // Deliberately don't re-issue over a revoked certificate automatically —
  // a revocation was a human decision (Rule 5) and shouldn't be silently
  // undone by the learner re-triggering an event.
  if (existing) return;

  const [course, enrolment] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId } }),
    prisma.enrolment.findUnique({
      where: { learnerId_courseId: { learnerId, courseId } },
    }),
  ]);
  if (!course || !enrolment) return;
  if (enrolment.progressPercent < 100) return;

  const quiz = await prisma.quiz.findUnique({ where: { courseId } });
  if (quiz) {
    const passedAttempt = await prisma.quizAttempt.findFirst({
      where: { quizId: quiz.id, learnerId, passed: true },
    });
    if (!passedAttempt) return;
  }

  const project = await prisma.project.findUnique({ where: { courseId } });
  if (project) {
    const passedSubmission = await prisma.projectSubmission.findFirst({
      where: {
        projectId: project.id,
        learnerId,
        status: "GRADED",
        score: { gte: 70 },
      },
    });
    if (!passedSubmission) return;
  }

  // Guard against a slim race (e.g. two events firing near-simultaneously)
  // on the unique certificate number rather than assuming single-writer.
  let certificateNumber = generateCertificateNumber();
  while (await prisma.certificate.findUnique({ where: { certificateNumber } })) {
    certificateNumber = generateCertificateNumber();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
  await prisma.$transaction(async (tx: any) => {
    const certificate = await tx.certificate.create({
      data: {
        certificateNumber,
        learnerId,
        courseId,
        competencyStatement: `Demonstrated competency in ${course.title}.`,
      },
    });
    await tx.certificateAuditLog.create({
      data: {
        certificateId: certificate.id,
        action: "ISSUED",
        performedById: null,
        notes: "Issued automatically on meeting course completion and competency criteria.",
      },
    });
  });
}
