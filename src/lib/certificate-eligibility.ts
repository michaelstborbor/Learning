import type { CourseGrade, GradeItem } from "@/lib/gradebook";

// A learner earns the certificate when their course grade (the weighted
// average of every quiz, the final quiz and the project, as shown on the
// Grades page) reaches this mark.
export const CERTIFICATE_PASS_PERCENT = 70;

export type CertificateEligibility =
  | { status: "qualified"; percent: number | null }
  | { status: "not-qualified"; percent: number }
  // Some quizzes or the project still have no score (not taken yet, or
  // the project is waiting to be graded), so the average isn't final.
  | { status: "in-progress"; percent: number | null; remaining: GradeItem[] };

/** Pure so it can be unit-tested: who may get a certificate. */
export function certificateEligibility(
  grade: CourseGrade | undefined,
  progressPercent: number,
): CertificateEligibility {
  const items = grade?.items ?? [];
  if (items.length === 0) {
    // Nothing to grade: finishing the lessons is the whole course.
    return progressPercent >= 100
      ? { status: "qualified", percent: null }
      : { status: "in-progress", percent: null, remaining: [] };
  }
  const remaining = items.filter((item) => item.score === null);
  if (remaining.length > 0) {
    return { status: "in-progress", percent: grade?.currentPercent ?? null, remaining };
  }
  // Every item has a score, so the weighted average is final.
  const percent = grade!.finalPercent;
  return percent >= CERTIFICATE_PASS_PERCENT
    ? { status: "qualified", percent }
    : { status: "not-qualified", percent };
}
