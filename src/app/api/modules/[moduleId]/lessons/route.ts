import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";

const lessonSchema = z.object({
  title: z.string().trim().min(2, "Give the lesson a title."),
  content: z.string().trim().min(10, "Lesson content is too short."),
});

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
  if (!canManageCourse(session, courseModule.course.instructorId)) {
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

  return NextResponse.json(created, { status: 201 });
}
