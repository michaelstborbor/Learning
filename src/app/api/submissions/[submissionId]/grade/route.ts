import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { applyProjectGrade } from "@/lib/project-grading";

const gradeSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string().trim().min(1, "Give the learner some feedback.").max(5000, "Keep feedback under 5,000 characters."),
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
  const graded = await applyProjectGrade({ submissionId, score, feedback, gradedById: session.userId });

  return NextResponse.json(graded);
}
