import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { autoGradeAvailable, autoGradeStuck, autoGradeSubmission } from "@/lib/auto-grade";

export const maxDuration = 300;

// Runs the automatic grader again on a submission still waiting for a
// grade, for example after it failed or the rubric was improved.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { submissionId } = await params;
  const submission = await prisma.projectSubmission.findUnique({
    where: { id: submissionId },
    include: { project: { include: { course: true } } },
  });
  if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  if (!canManageCourse(session, submission.project.course.instructorId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (submission.status !== "PENDING") {
    return NextResponse.json({ error: "This submission already has a grade." }, { status: 409 });
  }
  if (!submission.project.autoGrade || !autoGradeAvailable()) {
    return NextResponse.json({ error: "Automatic grading is switched off for this project." }, { status: 409 });
  }
  if (
    submission.autoGradeStatus === "RUNNING" &&
    !autoGradeStuck(submission.autoGradeStatus, submission.autoGradeStartedAt)
  ) {
    return NextResponse.json({ error: "This submission is already being marked." }, { status: 409 });
  }

  await prisma.projectSubmission.update({
    where: { id: submissionId },
    data: { autoGradeStatus: "RUNNING", autoGradeStartedAt: new Date(), autoGradeNote: null },
  });
  after(() => autoGradeSubmission(submissionId));
  return NextResponse.json({ ok: true }, { status: 202 });
}
