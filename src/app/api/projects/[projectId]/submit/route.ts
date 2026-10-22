import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { webUrlSchema } from "@/lib/validation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { safeFileName } from "@/lib/media";
import { deleteStored, putObject } from "@/lib/storage";
import {
  MAX_SUBMISSION_FILE_BYTES,
  SUBMISSION_FILE_TYPES,
  WRONG_FILE_TYPE_MESSAGE,
  matchesSubmissionFile,
  submissionFileExtension,
} from "@/lib/submission-files";

const submitSchema = z.object({
  submissionUrl: webUrlSchema.optional(),
  notes: z.string().trim().max(2000, "Keep notes under 2,000 characters.").optional(),
});

// The form posts multipart data when a file is attached; a link-only
// submission may also be sent as JSON.
async function readSubmission(request: Request) {
  if (!(request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    return { body: await request.json().catch(() => null), file: null };
  }
  const form = await request.formData().catch(() => null);
  if (!form) return { body: null, file: null };
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" && value.trim() ? value : undefined;
  };
  const file = form.get("file");
  return {
    body: { submissionUrl: text("submissionUrl"), notes: text("notes") },
    file: file instanceof File && file.size > 0 ? file : null,
  };
}

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

  // Each submission can store a file, so keep uploads to a sensible pace.
  const limit = await rateLimit(`project-submit:${session.userId}`, { limit: 10, windowSeconds: 3600 });
  if (!limit.allowed) return tooManyRequests(limit);

  const { body, file } = await readSubmission(request);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  if (!parsed.data.submissionUrl && !file) {
    return NextResponse.json(
      { error: "Upload your project file or add a link to your work." },
      { status: 400 },
    );
  }

  let stored: { fileKey: string; fileName: string; fileSize: number; fileType: string } | null = null;
  if (file) {
    const ext = submissionFileExtension(file.name);
    if (!ext) return NextResponse.json({ error: WRONG_FILE_TYPE_MESSAGE }, { status: 400 });
    if (file.size > MAX_SUBMISSION_FILE_BYTES) {
      return NextResponse.json({ error: "Your file must be smaller than 4 MB." }, { status: 413 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!matchesSubmissionFile(bytes, ext)) {
      return NextResponse.json(
        { error: `That file isn't a real ${ext} file. ${WRONG_FILE_TYPE_MESSAGE}` },
        { status: 400 },
      );
    }
    const fileKey = `submissions/${projectId}/${session.userId}/${randomBytes(9).toString("base64url")}${ext}`;
    await putObject(fileKey, bytes, SUBMISSION_FILE_TYPES[ext]);
    stored = { fileKey, fileName: safeFileName(file.name), fileSize: bytes.length, fileType: SUBMISSION_FILE_TYPES[ext] };
  }

  const submission = await prisma.projectSubmission
    .create({
      data: {
        projectId,
        learnerId: session.userId,
        submissionUrl: parsed.data.submissionUrl ?? null,
        ...stored,
        notes: parsed.data.notes,
        status: "PENDING",
      },
    })
    .catch(async (error) => {
      if (stored) await deleteStored(stored.fileKey).catch(() => {});
      throw error;
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
