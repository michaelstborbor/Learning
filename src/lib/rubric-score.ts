// Turns an automatic rubric check into a 0–100 project score. Pure so the
// rule is easy to test and explain to learners:
//
// - Each criterion counts 1 when met, ½ when partly met, 0 when not met.
//   Criteria that can't be checked from the upload are left out.
// - Criteria the rubric says are needed to pass make up 80 points and the
//   extras ("excellent work also…") the other 20. When a rubric has only
//   one kind, that kind is worth all 100.
// - A needed criterion that is not met at all keeps the score below the
//   pass mark, because the rubric says every one of them is needed.

export const PROJECT_PASS_PERCENT = 70;

export type CriterionResult = "met" | "partly_met" | "not_met" | "cannot_check";

export interface CheckedCriterion {
  criterion: string;
  neededToPass: boolean;
  result: CriterionResult;
  evidence: string;
}

const VALUE: Record<Exclude<CriterionResult, "cannot_check">, number> = { met: 1, partly_met: 0.5, not_met: 0 };

function average(criteria: CheckedCriterion[]): number | null {
  const checked = criteria.filter((c) => c.result !== "cannot_check");
  if (checked.length === 0) return null;
  return checked.reduce((sum, c) => sum + VALUE[c.result as keyof typeof VALUE], 0) / checked.length;
}

/** The score, or null when nothing in the rubric could be checked. */
export function rubricScore(criteria: CheckedCriterion[]): number | null {
  const needed = average(criteria.filter((c) => c.neededToPass));
  const extra = average(criteria.filter((c) => !c.neededToPass));
  if (needed === null && extra === null) return null;

  const raw =
    needed !== null && extra !== null ? 80 * needed + 20 * extra : 100 * (needed ?? extra!);
  const score = Math.round(raw);
  const missedNeeded = criteria.some((c) => c.neededToPass && c.result === "not_met");
  return missedNeeded ? Math.min(score, PROJECT_PASS_PERCENT - 1) : score;
}
