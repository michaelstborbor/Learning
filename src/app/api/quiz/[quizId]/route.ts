import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import {
  questionCreateData,
  quizInputSchema,
  quizSettingsData,
  toLearnerQuestions,
  loadQuizWithQuestions,
} from "@/lib/quiz";

// Learner view of a quiz. Deliberately reshaped by toLearnerQuestions —
// isCorrect and short-answer solutions never reach the browser.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { quizId } = await params;
  const quiz = await loadQuizWithQuestions(quizId);
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const enrolment = await prisma.enrolment.findUnique({
    where: {
      learnerId_courseId: { learnerId: session.userId, courseId: quiz.courseId },
    },
  });
  if (!enrolment) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  return NextResponse.json({
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    passMarkPercent: quiz.passMarkPercent,
    timeLimitMinutes: quiz.timeLimitMinutes,
    maxAttempts: quiz.maxAttempts,
    questions: toLearnerQuestions(quiz.questions, []),
  });
}

async function loadForManager(quizId: string) {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Not authorized." }, { status: 403 }) };
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { course: true } });
  if (!quiz) return { error: NextResponse.json({ error: "Quiz not found." }, { status: 404 }) };
  if (!canManageCourse(session, quiz.course.instructorId)) {
    return { error: NextResponse.json({ error: "Not authorized." }, { status: 403 }) };
  }
  return { quiz };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await params;
  const loaded = await loadForManager(quizId);
  if (loaded.error) return loaded.error;

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
      where: { id: parsed.data.moduleId, courseId: loaded.quiz.courseId },
    });
    if (!moduleItem) {
      return NextResponse.json({ error: "That module isn't part of this course." }, { status: 400 });
    }
  }

  // Full replace of the questions on save. Past attempts keep their own
  // review snapshot (QuizAttempt.review), so their results stay readable.
  await prisma.$transaction(async (tx) => {
    await tx.question.deleteMany({ where: { quizId } });
    await tx.quiz.update({
      where: { id: quizId },
      data: {
        ...quizSettingsData(parsed.data),
        questions: { create: questionCreateData(parsed.data.questions) },
      },
    });
  });

  return NextResponse.json({ id: quizId });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await params;
  const loaded = await loadForManager(quizId);
  if (loaded.error) return loaded.error;

  await prisma.quiz.delete({ where: { id: quizId } });
  return NextResponse.json({ ok: true });
}
