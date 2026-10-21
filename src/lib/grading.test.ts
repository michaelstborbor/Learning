import { describe, it, expect } from "vitest";
import { gradeQuiz, letterGrade, normalizeShortAnswer, type GradableQuestion } from "./grading";

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

describe("gradeQuiz with question types and points", () => {
  const mixed: GradableQuestion[] = [
    {
      id: "single",
      type: "SINGLE_CHOICE",
      points: 2,
      answers: [
        { id: "s-a", isCorrect: true },
        { id: "s-b", isCorrect: false },
      ],
    },
    {
      id: "multi",
      type: "MULTIPLE_CHOICE",
      points: 4,
      answers: [
        { id: "m-a", isCorrect: true },
        { id: "m-b", isCorrect: true },
        { id: "m-c", isCorrect: false },
        { id: "m-d", isCorrect: false },
      ],
    },
    {
      id: "tf",
      type: "TRUE_FALSE",
      points: 1,
      answers: [
        { id: "tf-true", isCorrect: false },
        { id: "tf-false", isCorrect: true },
      ],
    },
    {
      id: "short",
      type: "SHORT_ANSWER",
      points: 3,
      answers: [
        { id: "sa-1", isCorrect: true, text: "Ctrl + S" },
        { id: "sa-2", isCorrect: true, text: "Control S" },
      ],
    },
  ];

  it("weights questions by their points", () => {
    const result = gradeQuiz(
      mixed,
      { single: "s-a", multi: ["m-a", "m-b"], tf: "tf-false", short: "ctrl + s" },
      70,
    );
    expect(result.pointsPossible).toBe(10);
    expect(result.pointsEarned).toBe(10);
    expect(result.scorePercent).toBe(100);
    expect(result.correctCount).toBe(4);
  });

  it("gives partial credit on multiple choice and never rewards ticking every box", () => {
    const half = gradeQuiz(mixed, { multi: ["m-a"] }, 70);
    expect(half.results.find((r) => r.questionId === "multi")?.pointsEarned).toBe(2);

    const everything = gradeQuiz(mixed, { multi: ["m-a", "m-b", "m-c", "m-d"] }, 70);
    expect(everything.results.find((r) => r.questionId === "multi")?.pointsEarned).toBe(0);

    const oneEach = gradeQuiz(mixed, { multi: ["m-a", "m-c"] }, 70);
    expect(oneEach.results.find((r) => r.questionId === "multi")?.pointsEarned).toBe(0);
  });

  it("rejects more than one choice on a single-choice question", () => {
    const result = gradeQuiz(mixed, { single: ["s-a", "s-b"] }, 70);
    expect(result.results.find((r) => r.questionId === "single")?.pointsEarned).toBe(0);
  });

  it("matches short answers ignoring case, spacing and trailing punctuation", () => {
    expect(normalizeShortAnswer("  Control   S. ")).toBe("control s");
    const result = gradeQuiz(mixed, { short: "  CONTROL s!" }, 70);
    expect(result.results.find((r) => r.questionId === "short")?.correct).toBe(true);
    const wrong = gradeQuiz(mixed, { short: "Ctrl + P" }, 70);
    expect(wrong.results.find((r) => r.questionId === "short")?.correct).toBe(false);
  });

  it("ignores answer ids from other questions inside a multiple-choice response", () => {
    const result = gradeQuiz(mixed, { multi: ["m-a", "m-b", "s-a"] }, 70);
    expect(result.results.find((r) => r.questionId === "multi")?.correct).toBe(true);
  });
});

describe("letterGrade", () => {
  it("maps percentages to letters at the usual boundaries", () => {
    expect(letterGrade(95)).toBe("A");
    expect(letterGrade(90)).toBe("A");
    expect(letterGrade(89)).toBe("B");
    expect(letterGrade(70)).toBe("C");
    expect(letterGrade(60)).toBe("D");
    expect(letterGrade(59)).toBe("F");
  });
});
