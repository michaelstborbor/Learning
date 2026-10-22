import { describe, expect, it } from "vitest";
import { computeCourseGrade, type GradeItem } from "./gradebook";
import { certificateEligibility } from "./certificate-eligibility";

function item(id: string, score: number | null, weight = 1): GradeItem {
  return { id, kind: "quiz", title: id, weight, score, passed: (score ?? 0) >= 70, attempts: score === null ? 0 : 1 };
}

describe("certificateEligibility", () => {
  it("qualifies at exactly 70% once everything is graded", () => {
    const grade = computeCourseGrade([item("a", 60), item("b", 80)]);
    expect(certificateEligibility(grade, 0)).toEqual({ status: "qualified", percent: 70 });
  });

  it("uses the course weights for the average", () => {
    // (90 * 1 + 60 * 2) / 3 = 70
    const grade = computeCourseGrade([item("module", 90), item("final", 60, 2)]);
    expect(certificateEligibility(grade, 100).status).toBe("qualified");
  });

  it("says not qualified below 70% once everything is graded", () => {
    const grade = computeCourseGrade([item("a", 60), item("b", 70)]);
    expect(certificateEligibility(grade, 100)).toEqual({ status: "not-qualified", percent: 65 });
  });

  it("waits while something is still ungraded, however high the rest", () => {
    const grade = computeCourseGrade([item("a", 100), item("project", null)]);
    const result = certificateEligibility(grade, 100);
    expect(result.status).toBe("in-progress");
    expect(result.status === "in-progress" && result.remaining.map((i) => i.id)).toEqual(["project"]);
  });

  it("falls back to lesson completion for a course with no assessments", () => {
    const none = computeCourseGrade([]);
    expect(certificateEligibility(none, 100).status).toBe("qualified");
    expect(certificateEligibility(none, 99).status).toBe("in-progress");
    expect(certificateEligibility(undefined, 100).status).toBe("qualified");
  });
});
