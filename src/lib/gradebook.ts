import { prisma } from "@/lib/db";
import { letterGrade } from "@/lib/grading";

export interface GradeItem {
  id: string;
  kind: "quiz" | "project";
  title: string;
  weight: number;
  // Best score so far (0–100), or null when nothing has been graded yet.
  score: number | null;
  passed: boolean;
  attempts: number;
}

export interface CourseGrade {
  items: GradeItem[];
  // Weighted average over the items that have a score.
  currentPercent: number | null;
  // Weighted average over every item, ungraded ones counting as 0.
  finalPercent: number;
  letter: string | null;
  gradedCount: number;
}

/** Pure so it can be unit-tested: the weighting rule for a course grade. */
export function computeCourseGrade(items: GradeItem[]): CourseGrade {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  const graded = items.filter((i) => i.score !== null);
  const gradedWeight = graded.reduce((sum, i) => sum + i.weight, 0);
  const weightedSum = graded.reduce((sum, i) => sum + (i.score ?? 0) * i.weight, 0);

  const currentPercent =
    graded.length === 0
      ? null
      : gradedWeight > 0
        ? Math.round(weightedSum / gradedWeight)
        : Math.round(graded.reduce((s, i) => s + (i.score ?? 0), 0) / graded.length);
  const finalPercent = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return {
    items,
    currentPercent,
    finalPercent,
    letter: currentPercent === null ? null : letterGrade(currentPercent),
    gradedCount: graded.length,
  };
}

const PROJECT_PASS_SCORE = 70;

/** Grades for every learner in a course, keyed by learner id. One query per
 * table, not per learner, so the gradebook stays fast for large cohorts. */
export async function getCourseGrades(courseId: string, learnerIds?: string[]) {
  const [quizzes, project] = await Promise.all([
    prisma.quiz.findMany({
      where: { courseId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true, weight: true, passMarkPercent: true },
    }),
    prisma.project.findUnique({ where: { courseId }, select: { id: true, title: true, weight: true } }),
  ]);

  const learnerFilter = learnerIds ? { learnerId: { in: learnerIds } } : {};
  const [attempts, submissions] = await Promise.all([
    quizzes.length
      ? prisma.quizAttempt.findMany({
          where: { quizId: { in: quizzes.map((q) => q.id) }, status: "SUBMITTED", ...learnerFilter },
          select: { quizId: true, learnerId: true, scorePercent: true, passed: true },
        })
      : Promise.resolve([]),
    project
      ? prisma.projectSubmission.findMany({
          where: { projectId: project.id, ...learnerFilter },
          select: { learnerId: true, score: true, status: true },
        })
      : Promise.resolve([]),
  ]);

  const learnerSet = new Set<string>(learnerIds ?? []);
  attempts.forEach((a) => learnerSet.add(a.learnerId));
  submissions.forEach((s) => learnerSet.add(s.learnerId));

  const grades = new Map<string, CourseGrade>();
  for (const learnerId of learnerSet) {
    const items: GradeItem[] = quizzes.map((quiz) => {
      const mine = attempts.filter((a) => a.quizId === quiz.id && a.learnerId === learnerId);
      return {
        id: quiz.id,
        kind: "quiz",
        title: quiz.title,
        weight: quiz.weight,
        score: mine.length ? Math.max(...mine.map((a) => a.scorePercent)) : null,
        passed: mine.some((a) => a.passed),
        attempts: mine.length,
      };
    });
    if (project) {
      const mine = submissions.filter((s) => s.learnerId === learnerId);
      const scores = mine.filter((s) => s.status === "GRADED" && s.score !== null).map((s) => s.score!);
      const best = scores.length ? Math.max(...scores) : null;
      items.push({
        id: project.id,
        kind: "project",
        title: project.title,
        weight: project.weight,
        score: best,
        passed: best !== null && best >= PROJECT_PASS_SCORE,
        attempts: mine.length,
      });
    }
    grades.set(learnerId, computeCourseGrade(items));
  }

  return { quizzes, project, grades };
}
