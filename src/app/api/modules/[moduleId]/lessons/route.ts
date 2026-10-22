import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { lessonSchema } from "@/lib/course-content";
import { canUpdateCourseContent } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit-log";
import { recomputeCourseProgress } from "@/lib/progress";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { moduleId } = await params;
  const courseModule = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { course: true },
  });
  if (!courseModule) {
    return NextResponse.json({ error: "Module not found." }, { status: 404 });
  }
  if (!canUpdateCourseContent(session, courseModule.course)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = lessonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const lessonCount = await prisma.lesson.count({ where: { moduleId } });

  const created = await prisma.lesson.create({
    data: {
      moduleId,
      title: parsed.data.title,
      content: parsed.data.content,
      order: lessonCount,
    },
  });

  // Learners already enrolled now have one more lesson to finish.
  await recomputeCourseProgress(courseModule.courseId);
  await writeAuditLog({
    actorId: session.userId,
    action: "COURSE_LESSON_ADDED",
    targetType: "Course",
    targetId: courseModule.courseId,
    notes: `"${courseModule.course.title}": added lesson "${created.title}" to "${courseModule.title}"`,
  });

  return NextResponse.json(created, { status: 201 });
}
