import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { REVIEWER_ROLES } from "@/lib/roles";
import { writeAuditLog } from "@/lib/audit-log";

const reviewSchema = z.object({
  decision: z.enum(["APPROVE", "REQUEST_CHANGES"]),
  feedback: z.string().trim().optional(),
});

// Deliberately a distinct role group from PUBLISH_ROLES — a Content
// Reviewer can approve or reject content without also holding the power
// to publish it live, matching the brief's separate "Content Reviewer"
// role (PHASE0_BLUEPRINT.md Section 4).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await requireRole(REVIEWER_ROLES);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });

  if (course.status !== "UNDER_REVIEW") {
    return NextResponse.json(
      { error: "This course isn't waiting for review." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  if (parsed.data.decision === "REQUEST_CHANGES" && !parsed.data.feedback?.trim()) {
    return NextResponse.json(
      { error: "Explain what needs to change so the instructor knows what to fix." },
      { status: 400 },
    );
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data:
      parsed.data.decision === "APPROVE"
        ? { status: "APPROVED", reviewFeedback: null }
        : { status: "DRAFT", reviewFeedback: parsed.data.feedback },
  });

  await writeAuditLog({
    actorId: session.userId,
    action: parsed.data.decision === "APPROVE" ? "COURSE_REVIEW_APPROVED" : "COURSE_REVIEW_REJECTED",
    targetType: "Course",
    targetId: courseId,
    notes: parsed.data.feedback,
  });

  return NextResponse.json(updated);
}
