import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { quizId } = await params;
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { include: { answers: true }, orderBy: { order: "asc" } } },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const enrolment = await prisma.enrolment.findUnique({
    where: {
      learnerId_courseId: { learnerId: session.userId, courseId: quiz.courseId },
    },
  });
  if (!enrolment) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  // Deliberately reshape the response — never spread the raw Prisma object
  // here, or isCorrect leaks to the browser and the quiz becomes trivial
  // to cheat.
  return NextResponse.json({
    id: quiz.id,
    title: quiz.title,
    passMarkPercent: quiz.passMarkPercent,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
    questions: quiz.questions.map((q: any) => ({
      id: q.id,
      prompt: q.prompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
      answers: q.answers.map((a: any) => ({ id: a.id, text: a.text })),
    })),
  });
}
