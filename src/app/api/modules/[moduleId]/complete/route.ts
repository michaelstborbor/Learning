import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { markLessonsComplete } from "@/lib/progress";

// "Mark module complete": records every lesson in the module as done for
// the signed-in learner. Quizzes and the project are untouched; they still
// have to be passed for a certificate.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { moduleId } = await params;
  const moduleItem = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { courseId: true, lessons: { select: { id: true } } },
  });
  if (!moduleItem) {
    return NextResponse.json({ error: "Module not found." }, { status: 404 });
  }

  const enrolment = await prisma.enrolment.findUnique({
    where: { learnerId_courseId: { learnerId: session.userId, courseId: moduleItem.courseId } },
  });
  if (!enrolment) {
    return NextResponse.json(
      { error: "You need to enrol in this course first." },
      { status: 403 },
    );
  }

  const updatedEnrolment = await markLessonsComplete(
    session.userId,
    moduleItem.courseId,
    moduleItem.lessons.map((l) => l.id),
  );
  return NextResponse.json(updatedEnrolment);
}
