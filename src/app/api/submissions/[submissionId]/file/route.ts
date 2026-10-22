import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { contentDisposition } from "@/lib/media";
import { readObject } from "@/lib/storage";

// Downloads the spreadsheet attached to a project submission. Only the
// learner who sent it and the people who grade the course may open it.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { submissionId } = await params;
  const submission = await prisma.projectSubmission.findUnique({
    where: { id: submissionId },
    include: { project: { include: { course: { select: { instructorId: true } } } } },
  });
  if (!submission?.fileKey || !submission.fileName) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  const isOwner = submission.learnerId === session.userId;
  if (!isOwner && !canManageCourse(session, submission.project.course.instructorId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const bytes = await readObject(submission.fileKey);
  if (!bytes) return NextResponse.json({ error: "File not found." }, { status: 404 });

  // Always a download, never rendered: the file is the learner's content.
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": submission.fileType ?? "application/octet-stream",
      "Content-Length": String(bytes.length),
      "Content-Disposition": contentDisposition(submission.fileName, false),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "Cache-Control": "private, no-store",
    },
  });
}
