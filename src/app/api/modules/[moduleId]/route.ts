import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { moduleSchema } from "@/lib/course-content";
import { canUpdateCourseContent } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit-log";

// Renames a module. Works on published courses too: learners see the new
// title straight away, and their progress is unchanged.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { moduleId } = await params;
  const courseModule = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { course: { select: { id: true, title: true, instructorId: true, status: true } } },
  });
  if (!courseModule) return NextResponse.json({ error: "Module not found." }, { status: 404 });
  if (!canUpdateCourseContent(session, courseModule.course)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const parsed = moduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const updated = await prisma.module.update({
    where: { id: moduleId },
    data: { title: parsed.data.title },
  });

  if (updated.title !== courseModule.title) {
    await writeAuditLog({
      actorId: session.userId,
      action: "COURSE_MODULE_UPDATED",
      targetType: "Course",
      targetId: courseModule.course.id,
      notes: `"${courseModule.course.title}": renamed module "${courseModule.title}" to "${updated.title}"`,
    });
  }

  return NextResponse.json(updated);
}
