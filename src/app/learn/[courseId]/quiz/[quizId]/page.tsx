import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/Nav";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { QuizRunner } from "@/components/courses/QuizRunner";
import { attemptsRemaining, isPastDeadline, reviewForLearner } from "@/lib/quiz";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { courseId, quizId } = await params;
  const enrolment = await prisma.enrolment.findUnique({
    where: { learnerId_courseId: { learnerId: session.userId, courseId } },
  });
  if (!enrolment) redirect(`/learn/${courseId}`);

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      course: { select: { title: true } },
      module: { select: { title: true } },
      questions: { select: { points: true } },
    },
  });
  if (!quiz || quiz.courseId !== courseId) notFound();

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId, learnerId: session.userId },
    orderBy: { attemptedAt: "desc" },
  });
  const submitted = attempts.filter((a) => a.status === "SUBMITTED");
  const open = attempts.find((a) => a.status === "IN_PROGRESS" && !isPastDeadline(a));

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <QuizRunner
          courseId={courseId}
          quiz={{
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            courseTitle: quiz.course.title,
            moduleTitle: quiz.module?.title ?? null,
            passMarkPercent: quiz.passMarkPercent,
            timeLimitMinutes: quiz.timeLimitMinutes,
            maxAttempts: quiz.maxAttempts,
            questionCount: quiz.questions.length,
            totalPoints: quiz.questions.reduce((sum, q) => sum + q.points, 0),
            showAnswers: quiz.showAnswers,
          }}
          hasOpenAttempt={Boolean(open)}
          attemptsRemaining={attemptsRemaining(quiz, submitted.length)}
          history={submitted.slice(0, 10).map((a) => ({
            id: a.id,
            scorePercent: a.scorePercent,
            pointsEarned: a.pointsEarned,
            pointsPossible: a.pointsPossible,
            passed: a.passed,
            submittedAt: (a.submittedAt ?? a.attemptedAt).toISOString(),
            review: reviewForLearner(a.review, quiz.showAnswers),
          }))}
        />
      </main>
    </>
  );
}
