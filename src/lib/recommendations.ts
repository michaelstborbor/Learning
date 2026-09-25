import { prisma } from "@/lib/db";

export interface RecommendationResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
  courses: any[];
  reason: string;
}

/**
 * Deliberately simple, transparent rules — no AI/ML, per
 * PHASE0_BLUEPRINT.md's explicit MVP guidance ("Initially use transparent
 * rule-based recommendations. Do not introduce an unnecessarily complex AI
 * recommendation engine in the MVP.") The reason string shown to the
 * learner is the actual rule that fired, not a generated explanation —
 * what you see is genuinely why it's there.
 *
 * Rule 1: if the learner has enrolments, recommend other published courses
 * in the same category(ies) they're already engaged with.
 * Rule 2 (fallback): if rule 1 finds nothing (no enrolments, or no other
 * courses in their categories), recommend the most recently published
 * courses overall.
 */
export async function getRecommendedCourses(
  learnerId: string,
  limit = 3,
): Promise<RecommendationResult> {
  const enrolments = await prisma.enrolment.findMany({
    where: { learnerId },
    include: { course: { select: { category: true } } },
  });
  const enrolledCourseIds = await prisma.enrolment
    .findMany({ where: { learnerId }, select: { courseId: true } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
    .then((rows: any[]) => rows.map((r) => r.courseId));

  const categories = Array.from(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
    new Set(enrolments.map((e: any) => e.course.category as string)),
  );

  if (categories.length > 0) {
    const recs = await prisma.course.findMany({
      where: {
        status: "PUBLISHED",
        category: { in: categories },
        id: { notIn: enrolledCourseIds },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    if (recs.length > 0) {
      return {
        courses: recs,
        reason:
          categories.length === 1
            ? `Because you're learning ${categories[0]}`
            : `Because you're learning ${categories.slice(0, -1).join(", ")} and ${categories[categories.length - 1]}`,
      };
    }
  }

  const fallback = await prisma.course.findMany({
    where: { status: "PUBLISHED", id: { notIn: enrolledCourseIds } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return { courses: fallback, reason: "Recently added" };
}
