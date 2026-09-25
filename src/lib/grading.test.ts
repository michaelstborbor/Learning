import { describe, it, expect } from "vitest";
import { gradeQuiz, type GradableQuestion } from "./grading";

const twoQuestionQuiz: GradableQuestion[] = [
  {
    id: "q1",
    answers: [
      { id: "q1-a", isCorrect: true },
      { id: "q1-b", isCorrect: false },
    ],
  },
  {
    id: "q2",
    answers: [
      { id: "q2-a", isCorrect: false },
      { id: "q2-b", isCorrect: true },
    ],
  },
];

describe("gradeQuiz", () => {
  it("scores 100% when every answer is correct", () => {
    const result = gradeQuiz(twoQuestionQuiz, { q1: "q1-a", q2: "q2-b" }, 70);
    expect(result.scorePercent).toBe(100);
    expect(result.correctCount).toBe(2);
    expect(result.passed).toBe(true);
  });

  it("scores 0% when every answer is wrong", () => {
    const result = gradeQuiz(twoQuestionQuiz, { q1: "q1-b", q2: "q2-a" }, 70);
    expect(result.scorePercent).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("scores partial credit correctly", () => {
    const result = gradeQuiz(twoQuestionQuiz, { q1: "q1-a", q2: "q2-a" }, 70);
    expect(result.scorePercent).toBe(50);
  });

  it("treats a missing answer for a question as wrong, not as an error", () => {
    const result = gradeQuiz(twoQuestionQuiz, { q1: "q1-a" }, 70);
    expect(result.scorePercent).toBe(50);
    expect(result.correctCount).toBe(1);
  });

  it("ignores answer ids for questions that don't exist in this quiz", () => {
    // A client sending extra/unexpected keys must never be able to
    // manufacture points that aren't backed by a real question.
    const result = gradeQuiz(twoQuestionQuiz, {
      q1: "q1-a",
      q2: "q2-b",
      "not-a-real-question": "not-a-real-answer",
    }, 70);
    expect(result.scorePercent).toBe(100);
    expect(result.correctCount).toBe(2);
  });

  it("respects the pass mark exactly at the boundary", () => {
    const atBoundary = gradeQuiz(twoQuestionQuiz, { q1: "q1-a", q2: "q2-a" }, 50);
    expect(atBoundary.passed).toBe(true); // 50% score, 50% pass mark — passes

    const justBelow = gradeQuiz(twoQuestionQuiz, { q1: "q1-a", q2: "q2-a" }, 51);
    expect(justBelow.passed).toBe(false); // 50% score, 51% pass mark — fails
  });

  it("handles a quiz with zero questions without dividing by zero", () => {
    const result = gradeQuiz([], {}, 70);
    expect(result.scorePercent).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("a submitted answer id that matches a WRONG answer from a different question is never counted as correct for this question", () => {
    // Guards against a subtle bug class: cross-question answer-id
    // confusion. q2-b is correct for q2, but submitting it as the answer
    // for q1 must not accidentally match q1's correct answer.
    const result = gradeQuiz(twoQuestionQuiz, { q1: "q2-b", q2: "q2-b" }, 70);
    expect(result.correctCount).toBe(1);
    expect(result.scorePercent).toBe(50);
  });
});
