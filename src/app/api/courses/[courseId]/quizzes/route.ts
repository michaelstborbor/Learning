import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { questionCreateData, quizInputSchema, quizSettingsData } from "@/lib/quiz";

// Creates a new quiz on a course. A course can hold several quizzes: one
// per module and/or a course-level final quiz (moduleId left empty).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  if (!canManageCourse(session, course.instructorId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = quizInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  if (parsed.data.moduleId) {
    const moduleItem = await prisma.module.findFirst({
      where: { id: parsed.data.moduleId, courseId },
    });
    if (!moduleItem) {
      return NextResponse.json({ error: "That module isn't part of this course." }, { status: 400 });
    }
  }

  const order = await prisma.quiz.count({ where: { courseId } });
  const quiz = await prisma.quiz.create({
    data: {
      courseId,
      order,
      ...quizSettingsData(parsed.data),
      questions: { create: questionCreateData(parsed.data.questions) },
    },
  });

  return NextResponse.json({ id: quiz.id }, { status: 201 });
}
