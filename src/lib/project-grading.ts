import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { maybeIssueCertificate } from "@/lib/certificates";
import { PROJECT_PASS_PERCENT } from "@/lib/rubric-score";

// Records a project grade, whether an instructor gave it or the automatic
// grader did, so both follow the same rules: a passing grade marks the
// project's skill Demonstrated and may issue the certificate.
export async function applyProjectGrade(opts: {
  submissionId: string;
  score: number;
  feedback: string;
  // Null when the system graded it.
  gradedById: string | null;
  automatic?: { details: Prisma.InputJsonValue };
}) {
  const submission = await prisma.projectSubmission.findUnique({
    where: { id: opts.submissionId },
    include: { project: { select: { courseId: true, skillId: true } } },
  });
  if (!submission) return null;
  const passed = opts.score >= PROJECT_PASS_PERCENT;

  const graded = await prisma.$transaction(async (tx) => {
    // The automatic grade never replaces a grade a person has given.
    if (opts.automatic) {
      const claimed = await tx.projectSubmission.updateMany({
        where: { id: submission.id, status: "PENDING" },
        data: {
          score: opts.score,
          feedback: opts.feedback,
          status: "GRADED",
          gradedById: null,
          gradedAt: new Date(),
          gradedAutomatically: true,
          autoGradeStatus: "GRADED",
          autoGradeNote: null,
          autoGradeDetails: opts.automatic.details,
        },
      });
      if (claimed.count === 0) return null;
    } else {
      await tx.projectSubmission.update({
        where: { id: submission.id },
        data: {
          score: opts.score,
          feedback: opts.feedback,
          status: "GRADED",
          gradedById: opts.gradedById,
          gradedAt: new Date(),
          gradedAutomatically: false,
        },
      });
    }

    // A passing grade is the only thing that promotes a skill to
    // Demonstrated: watching lessons and submitting were never enough.
    if (submission.project.skillId && passed) {
      await tx.learnerSkill.upsert({
        where: { learnerId_skillId: { learnerId: submission.learnerId, skillId: submission.project.skillId } },
        update: { verificationStatus: "DEMONSTRATED", evidenceSubmissionId: submission.id },
        create: {
          learnerId: submission.learnerId,
          skillId: submission.project.skillId,
          verificationStatus: "DEMONSTRATED",
          evidenceSubmissionId: submission.id,
        },
      });
    }
    // An instructor lowering an automatic pass takes back the skill that
    // pass gave (an issued certificate stays, as with any later change).
    if (submission.project.skillId && !passed && submission.status === "GRADED") {
      await tx.learnerSkill.updateMany({
        where: {
          learnerId: submission.learnerId,
          skillId: submission.project.skillId,
          evidenceSubmissionId: submission.id,
          verificationStatus: "DEMONSTRATED",
        },
        data: { verificationStatus: "IN_PROGRESS" },
      });
    }
    return tx.projectSubmission.findUnique({ where: { id: submission.id } });
  });

  if (graded && passed) await maybeIssueCertificate(submission.learnerId, submission.project.courseId);
  return graded;
}
