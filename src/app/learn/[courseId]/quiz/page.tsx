import { redirect, notFound } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { QuizRunner } from "@/components/courses/QuizRunner";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { courseId } = await params;
  const enrolment = await prisma.enrolment.findUnique({
    where: { learnerId_courseId: { learnerId: session.userId, courseId } },
  });
  if (!enrolment) redirect(`/learn/${courseId}`);

  const quiz = await prisma.quiz.findUnique({ where: { courseId } });
  if (!quiz) notFound();

  const previousAttempts = await prisma.quizAttempt.findMany({
    where: { quizId: quiz.id, learnerId: session.userId },
    orderBy: { attemptedAt: "desc" },
    take: 5,
  });

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <QuizRunner
          quizId={quiz.id}
          courseId={courseId}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
          previousAttempts={previousAttempts.map((a: any) => ({
            scorePercent: a.scorePercent,
            passed: a.passed,
          }))}
        />
      </main>
    </>
  );
}
