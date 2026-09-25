import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";

const answerSchema = z.object({
  text: z.string().trim().min(1),
  isCorrect: z.boolean(),
});

const questionSchema = z.object({
  prompt: z.string().trim().min(3),
  answers: z.array(answerSchema).min(2, "Each question needs at least 2 options."),
});

const quizSchema = z.object({
  title: z.string().trim().min(2),
  passMarkPercent: z.number().int().min(0).max(100).default(70),
  questions: z.array(questionSchema).min(1, "Add at least one question."),
});

export async function PUT(
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
  const parsed = quizSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const eachQuestionHasCorrectAnswer = parsed.data.questions.every((q) =>
    q.answers.some((a) => a.isCorrect),
  );
  if (!eachQuestionHasCorrectAnswer) {
    return NextResponse.json(
      { error: "Every question needs at least one correct answer marked." },
      { status: 400 },
    );
  }

  // NOTE: `tx` is typed `any` here because the Prisma client isn't
  // generated in the sandbox this was built in (see ARCHITECTURE.md,
  // "Known sandbox limitation"). On a machine with normal internet access,
  // `npx prisma generate` produces full types and this annotation becomes
  // unnecessary (but harmless) — it's not masking a real logic bug.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
  const quiz = await prisma.$transaction(async (tx: any) => {
    // Full replace on save: delete existing questions (cascades to
    // answers) then recreate. Simpler and less error-prone than diffing
    // incremental edits for an MVP authoring flow.
    const existing = await tx.quiz.findUnique({ where: { courseId } });
    if (existing) {
      await tx.question.deleteMany({ where: { quizId: existing.id } });
    }

    return tx.quiz.upsert({
      where: { courseId },
      update: {
        title: parsed.data.title,
        passMarkPercent: parsed.data.passMarkPercent,
        questions: {
          create: parsed.data.questions.map((q, qIndex) => ({
            prompt: q.prompt,
            order: qIndex,
            answers: { create: q.answers },
          })),
        },
      },
      create: {
        courseId,
        title: parsed.data.title,
        passMarkPercent: parsed.data.passMarkPercent,
        questions: {
          create: parsed.data.questions.map((q, qIndex) => ({
            prompt: q.prompt,
            order: qIndex,
            answers: { create: q.answers },
          })),
        },
      },
      include: { questions: { include: { answers: true } } },
    });
  });

  return NextResponse.json(quiz);
}
