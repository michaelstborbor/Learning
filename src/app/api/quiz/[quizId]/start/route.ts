import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { loadQuizWithQuestions, startOrResumeAttempt } from "@/lib/quiz";

// Starts (or resumes) a timed attempt. The deadline is fixed here, on the
// server, so reloading the page or changing the device clock can't buy
// extra time.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { quizId } = await params;
  const quiz = await loadQuizWithQuestions(quizId);
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const enrolment = await prisma.enrolment.findUnique({
    where: { learnerId_courseId: { learnerId: session.userId, courseId: quiz.courseId } },
  });
  if (!enrolment) {
    return NextResponse.json({ error: "You need to enrol in this course first." }, { status: 403 });
  }

  const result = await startOrResumeAttempt(quiz, session.userId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    attemptId: result.attempt.id,
    startedAt: result.attempt.attemptedAt.toISOString(),
    deadlineAt: result.attempt.deadlineAt?.toISOString() ?? null,
    serverNow: new Date().toISOString(),
    responses: result.attempt.responses ?? {},
    questions: result.questions,
  });
}
