import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  finalizeAttempt,
  isPastDeadline,
  loadQuizWithQuestions,
  responsesSchema,
  reviewForLearner,
} from "@/lib/quiz";

const attemptSchema = z.object({
  attemptId: z.string(),
  // Map of questionId -> chosen answer id(s) or short-answer text.
  answers: responsesSchema,
});

async function loadOwnAttempt(quizId: string, attemptId: string, learnerId: string) {
  const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.quizId !== quizId || attempt.learnerId !== learnerId) return null;
  return attempt;
}

// Autosave while the attempt is in progress, so a dropped connection or an
// expired timer never loses what the learner already answered.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { quizId } = await params;
  const parsed = attemptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission." }, { status: 400 });

  const attempt = await loadOwnAttempt(quizId, parsed.data.attemptId, session.userId);
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS" || isPastDeadline(attempt)) {
    return NextResponse.json({ error: "This attempt has already ended." }, { status: 409 });
  }

  await prisma.quizAttempt.update({
    where: { id: attempt.id },
    data: { responses: parsed.data.answers },
  });
  return NextResponse.json({ ok: true });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { quizId } = await params;
  const quiz = await loadQuizWithQuestions(quizId);
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const parsed = attemptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const attempt = await loadOwnAttempt(quizId, parsed.data.attemptId, session.userId);
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });

  // Grading happens entirely server-side against the stored correct
  // answers — the client only ever sends which option it picked, never a
  // score. A submission after the deadline (plus a short grace period)
  // only counts what was autosaved in time; see finalizeAttempt().
  const final =
    attempt.status === "SUBMITTED"
      ? attempt
      : await finalizeAttempt(quiz, attempt, parsed.data.answers);

  const submittedCount = await prisma.quizAttempt.count({
    where: { quizId, learnerId: session.userId, status: "SUBMITTED" },
  });

  return NextResponse.json(
    {
      id: final.id,
      scorePercent: final.scorePercent,
      pointsEarned: final.pointsEarned,
      pointsPossible: final.pointsPossible,
      passed: final.passed,
      lateSubmission: isPastDeadline(attempt),
      attemptsRemaining:
        quiz.maxAttempts === null ? null : Math.max(0, quiz.maxAttempts - submittedCount),
      review: reviewForLearner(final.review, quiz.showAnswers),
    },
    { status: 201 },
  );
}
