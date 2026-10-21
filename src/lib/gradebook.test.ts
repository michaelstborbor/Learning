import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

const { computeCourseGrade } = await import("./gradebook");

describe("computeCourseGrade", () => {
  it("weights each assessment by its weight", () => {
    const grade = computeCourseGrade([
      { id: "q1", kind: "quiz", title: "Quiz", weight: 1, score: 60, passed: false, attempts: 1 },
      { id: "p1", kind: "project", title: "Project", weight: 3, score: 100, passed: true, attempts: 1 },
    ]);
    expect(grade.currentPercent).toBe(90);
    expect(grade.finalPercent).toBe(90);
    expect(grade.letter).toBe("A");
  });

  it("separates the current grade from the final grade while work is outstanding", () => {
    const grade = computeCourseGrade([
      { id: "q1", kind: "quiz", title: "Quiz", weight: 1, score: 80, passed: true, attempts: 2 },
      { id: "q2", kind: "quiz", title: "Final", weight: 1, score: null, passed: false, attempts: 0 },
    ]);
    expect(grade.currentPercent).toBe(80);
    expect(grade.finalPercent).toBe(40);
    expect(grade.gradedCount).toBe(1);
  });

  it("has no grade yet when nothing has been graded", () => {
    const grade = computeCourseGrade([
      { id: "q1", kind: "quiz", title: "Quiz", weight: 1, score: null, passed: false, attempts: 0 },
    ]);
    expect(grade.currentPercent).toBeNull();
    expect(grade.letter).toBeNull();
    expect(grade.finalPercent).toBe(0);
  });

  it("falls back to a plain average when every graded item has zero weight", () => {
    const grade = computeCourseGrade([
      { id: "q1", kind: "quiz", title: "Practice", weight: 0, score: 50, passed: false, attempts: 1 },
      { id: "q2", kind: "quiz", title: "Practice 2", weight: 0, score: 100, passed: true, attempts: 1 },
    ]);
    expect(grade.currentPercent).toBe(75);
  });
});
