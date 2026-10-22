import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { moduleSchema } from "@/lib/course-content";
import { canUpdateCourseContent } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit-log";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  if (!canUpdateCourseContent(session, course)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = moduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const moduleCount = await prisma.module.count({ where: { courseId } });

  const created = await prisma.module.create({
    data: { courseId, title: parsed.data.title, order: moduleCount },
  });

  await writeAuditLog({
    actorId: session.userId,
    action: "COURSE_MODULE_ADDED",
    targetType: "Course",
    targetId: courseId,
    notes: `"${course.title}": added module "${created.title}"`,
  });

  return NextResponse.json(created, { status: 201 });
}
