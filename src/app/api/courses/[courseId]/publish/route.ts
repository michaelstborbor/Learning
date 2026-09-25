import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PUBLISH_ROLES } from "@/lib/roles";
import { writeAuditLog } from "@/lib/audit-log";

// Admin-only (not the owning instructor) — see Rule 55: "No instructor
// should automatically publish high-stakes or paid content without
// appropriate authorization." This is the final step of the Draft ->
// Under Review -> Approved -> Published workflow (see
// api/courses/[courseId]/submit-review and .../review) — publishing only
// moves a course out of Approved, and unpublishing only moves it from
// Published back to Archived. Any other transition is rejected rather
// than silently allowed, so the workflow can't be skipped by hitting this
// endpoint directly.
type CourseStatusValue = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

const ALLOWED_TRANSITIONS: Partial<Record<CourseStatusValue, CourseStatusValue>> = {
  APPROVED: "PUBLISHED",
  PUBLISHED: "ARCHIVED",
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await requireRole(PUBLISH_ROLES);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const nextStatus = ALLOWED_TRANSITIONS[course.status as CourseStatusValue];
  if (!nextStatus) {
    return NextResponse.json(
      {
        error:
          course.status === "DRAFT" || course.status === "UNDER_REVIEW"
            ? "This course needs reviewer approval before it can be published."
            : "This course can't be published or archived from its current status.",
      },
      { status: 400 },
    );
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { status: nextStatus },
  });

  await writeAuditLog({
    actorId: session.userId,
    action: `COURSE_${nextStatus}`,
    targetType: "Course",
    targetId: courseId,
  });

  return NextResponse.json(updated);
}
