import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { maybeIssueCertificate } from "@/lib/certificates";

const PASS_THRESHOLD = 70;

const gradeSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string().trim().min(1, "Give the learner some feedback."),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { submissionId } = await params;
  const submission = await prisma.projectSubmission.findUnique({
    where: { id: submissionId },
    include: { project: { include: { course: true } } },
  });
  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  if (!canManageCourse(session, submission.project.course.instructorId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = gradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const { score, feedback } = parsed.data;
  const passed = score >= PASS_THRESHOLD;

  // See the note in api/courses/[courseId]/quiz/route.ts about `: any`
  // here — Prisma stub limitation in the build sandbox, not a real gap.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
  const graded = await prisma.$transaction(async (tx: any) => {
    const updatedSubmission = await tx.projectSubmission.update({
      where: { id: submissionId },
      data: {
        score,
        feedback,
        status: "GRADED",
        gradedById: session.userId,
        gradedAt: new Date(),
      },
    });

    // A passing grade — a human assessor confirming the work meets the
    // rubric — is the only thing that promotes a skill to Demonstrated.
    // This is the concrete enforcement of Rule 1/2: watching lessons and
    // submitting alone were never enough; only this step counts.
    if (submission.project.skillId && passed) {
      await tx.learnerSkill.upsert({
        where: {
          learnerId_skillId: {
            learnerId: submission.learnerId,
            skillId: submission.project.skillId,
          },
        },
        update: {
          verificationStatus: "DEMONSTRATED",
          evidenceSubmissionId: submission.id,
        },
        create: {
          learnerId: submission.learnerId,
          skillId: submission.project.skillId,
          verificationStatus: "DEMONSTRATED",
          evidenceSubmissionId: submission.id,
        },
      });
    }

    return updatedSubmission;
  });

  if (passed) {
    await maybeIssueCertificate(submission.learnerId, submission.project.courseId);
  }

  return NextResponse.json(graded);
}
