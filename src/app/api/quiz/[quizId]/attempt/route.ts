import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { maybeIssueCertificate } from "@/lib/certificates";
import { gradeQuiz } from "@/lib/grading";

const attemptSchema = z.object({
  // Map of questionId -> chosen answerId
  answers: z.record(z.string(), z.string()),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { quizId } = await params;
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { include: { answers: true } }, course: true },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const enrolment = await prisma.enrolment.findUnique({
    where: {
      learnerId_courseId: { learnerId: session.userId, courseId: quiz.courseId },
    },
  });
  if (!enrolment) {
    return NextResponse.json(
      { error: "You need to enrol in this course first." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = attemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  // Grading happens entirely server-side against the stored correct
  // answers — the client only ever sends which option it picked, never a
  // score. This is the same "never trust the frontend" rule the payments
  // architecture uses, applied to assessments. The actual rule lives in
  // gradeQuiz() (src/lib/grading.ts) so it's unit-tested directly, not
  // only exercised indirectly through this route.
  const { scorePercent, passed } = gradeQuiz(
    quiz.questions,
    parsed.data.answers,
    quiz.passMarkPercent,
  );

  const attempt = await prisma.quizAttempt.create({
    data: { quizId, learnerId: session.userId, scorePercent, passed },
  });

  if (passed) {
    await maybeIssueCertificate(session.userId, quiz.courseId);
  }

  return NextResponse.json(attempt, { status: 201 });
}
