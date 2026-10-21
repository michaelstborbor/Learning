import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";

// Courses used to have a single quiz at this address. Keep old links
// working by sending them to the course's first quiz.
export default async function LegacyQuizPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const quiz = await prisma.quiz.findFirst({
    where: { courseId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (!quiz) notFound();
  redirect(`/learn/${courseId}/quiz/${quiz.id}`);
}
