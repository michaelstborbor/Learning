import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { maybeIssueCertificate } from "@/lib/certificates";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  }

  const courseId = lesson.module.courseId;
  const enrolment = await prisma.enrolment.findUnique({
    where: { learnerId_courseId: { learnerId: session.userId, courseId } },
  });
  if (!enrolment) {
    return NextResponse.json(
      { error: "You need to enrol in this course first." },
      { status: 403 },
    );
  }

  await prisma.lessonProgress.upsert({
    where: { learnerId_lessonId: { learnerId: session.userId, lessonId } },
    update: {},
    create: { learnerId: session.userId, lessonId },
  });

  // Recompute progress from source-of-truth counts rather than
  // incrementing a counter — avoids drift if lessons are added/removed.
  const totalLessons = await prisma.lesson.count({
    where: { module: { courseId } },
  });
  const completedLessons = await prisma.lessonProgress.count({
    where: { learnerId: session.userId, lesson: { module: { courseId } } },
  });
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const updatedEnrolment = await prisma.enrolment.update({
    where: { learnerId_courseId: { learnerId: session.userId, courseId } },
    data: {
      progressPercent,
      completedAt: progressPercent === 100 ? new Date() : null,
    },
  });

  // Reaching 100% is one of the three possible last-criteria-met events
  // for a certificate (see src/lib/certificates.ts) — check every time,
  // not just when we know it's the final lesson.
  if (progressPercent === 100) {
    await maybeIssueCertificate(session.userId, courseId);
  }

  return NextResponse.json(updatedEnrolment);
}
