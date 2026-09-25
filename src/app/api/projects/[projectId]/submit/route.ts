import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const submitSchema = z.object({
  submissionUrl: z.string().trim().url("Enter a valid link to your work."),
  notes: z.string().trim().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { course: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const enrolment = await prisma.enrolment.findUnique({
    where: {
      learnerId_courseId: { learnerId: session.userId, courseId: project.courseId },
    },
  });
  if (!enrolment) {
    return NextResponse.json(
      { error: "You need to enrol in this course first." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const submission = await prisma.projectSubmission.create({
    data: {
      projectId,
      learnerId: session.userId,
      submissionUrl: parsed.data.submissionUrl,
      notes: parsed.data.notes,
      status: "PENDING",
    },
  });

  // Submitting is evidence of active work toward the skill — mark it
  // In Progress. It only becomes Demonstrated once a human grader passes
  // it (see /api/submissions/[submissionId]/grade). Completing a video or
  // submitting once is never enough on its own — Rule 1/2.
  if (project.skillId) {
    await prisma.learnerSkill.upsert({
      where: { learnerId_skillId: { learnerId: session.userId, skillId: project.skillId } },
      update: {
        verificationStatus: "IN_PROGRESS",
        evidenceSubmissionId: submission.id,
      },
      create: {
        learnerId: session.userId,
        skillId: project.skillId,
        verificationStatus: "IN_PROGRESS",
        evidenceSubmissionId: submission.id,
      },
    });
  }

  return NextResponse.json(submission, { status: 201 });
}
