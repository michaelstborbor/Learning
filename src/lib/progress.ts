import { prisma } from "@/lib/db";
import { maybeIssueCertificate } from "@/lib/certificates";

// Records lessons as done for a learner and recomputes their course
// progress. Shared by "Mark lesson complete" and "Mark module complete" so
// both follow the same rules, including issuing the certificate.
export async function markLessonsComplete(learnerId: string, courseId: string, lessonIds: string[]) {
  if (lessonIds.length > 0) {
    await prisma.lessonProgress.createMany({
      data: lessonIds.map((lessonId) => ({ learnerId, lessonId })),
      skipDuplicates: true,
    });
  }

  // Recompute progress from source-of-truth counts rather than
  // incrementing a counter — avoids drift if lessons are added/removed.
  const [totalLessons, completedLessons] = await Promise.all([
    prisma.lesson.count({ where: { module: { courseId } } }),
    prisma.lessonProgress.count({
      where: { learnerId, lesson: { module: { courseId } } },
    }),
  ]);
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const enrolment = await prisma.enrolment.update({
    where: { learnerId_courseId: { learnerId, courseId } },
    data: {
      progressPercent,
      completedAt: progressPercent === 100 ? new Date() : null,
    },
  });

  // Reaching 100% is one of the three possible last-criteria-met events
  // for a certificate (see src/lib/certificates.ts) — check every time,
  // not just when we know it's the final lesson.
  if (progressPercent === 100) {
    await maybeIssueCertificate(learnerId, courseId);
  }

  return enrolment;
}

// Brings every enrolled learner's progress in line after lessons are added
// to a course, so a learner who had finished every lesson sees the new one
// as still to do. Lessons they already completed stay completed, and
// certificates already issued are not touched.
export async function recomputeCourseProgress(courseId: string) {
  const [totalLessons, enrolments, completed] = await Promise.all([
    prisma.lesson.count({ where: { module: { courseId } } }),
    prisma.enrolment.findMany({
      where: { courseId },
      select: { learnerId: true, progressPercent: true, completedAt: true },
    }),
    prisma.lessonProgress.groupBy({
      by: ["learnerId"],
      where: { lesson: { module: { courseId } } },
      _count: { _all: true },
    }),
  ]);
  const completedBy = new Map(completed.map((row) => [row.learnerId, row._count._all]));

  for (const enrolment of enrolments) {
    // A learner who hasn't completed a lesson here has nothing to recount.
    const done = completedBy.get(enrolment.learnerId);
    if (done === undefined) continue;
    const progressPercent = totalLessons > 0 ? Math.round((done / totalLessons) * 100) : 0;
    if (progressPercent === enrolment.progressPercent) continue;
    await prisma.enrolment.update({
      where: { learnerId_courseId: { learnerId: enrolment.learnerId, courseId } },
      data: {
        progressPercent,
        completedAt: progressPercent === 100 ? (enrolment.completedAt ?? new Date()) : null,
      },
    });
    if (progressPercent === 100) await maybeIssueCertificate(enrolment.learnerId, courseId);
  }
}
