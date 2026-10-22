import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { lessonSchema } from "@/lib/course-content";
import { canUpdateCourseContent } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit-log";

// Edits a lesson's title and text. Works on published courses too:
// learners see the new text straight away, and a lesson they already
// completed stays completed.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: { select: { id: true, title: true, instructorId: true, status: true } } } } },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  if (!canUpdateCourseContent(session, lesson.module.course)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const parsed = lessonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: { title: parsed.data.title, content: parsed.data.content },
  });

  const changed = [
    ...(updated.title !== lesson.title ? ["title"] : []),
    ...(updated.content !== lesson.content ? ["text"] : []),
  ];
  if (changed.length > 0) {
    await writeAuditLog({
      actorId: session.userId,
      action: "COURSE_LESSON_UPDATED",
      targetType: "Course",
      targetId: lesson.module.course.id,
      notes: `"${lesson.module.course.title}": changed the ${changed.join(" and ")} of lesson "${updated.title}"`,
    });
  }

  return NextResponse.json(updated);
}
