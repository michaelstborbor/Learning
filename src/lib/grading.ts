export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";

export interface GradableAnswer {
  id: string;
  isCorrect: boolean;
  text?: string;
}

export interface GradableQuestion {
  id: string;
  answers: GradableAnswer[];
  // Optional so older call sites (and tests) that only know about
  // single-correct-answer questions worth one point keep working.
  type?: QuestionType;
  points?: number;
}

/** What a learner sent for one question: an answer id for single-choice and
 * true/false, a list of answer ids for multiple-choice, free text for short
 * answer. Anything else is treated as unanswered. */
export type SubmittedResponse = string | string[];

export interface QuestionResult {
  questionId: string;
  pointsEarned: number;
  pointsPossible: number;
  correct: boolean;
}

export interface QuizGradeResult {
  correctCount: number;
  totalQuestions: number;
  pointsEarned: number;
  pointsPossible: number;
  scorePercent: number;
  passed: boolean;
  results: QuestionResult[];
}

/** Short answers are compared ignoring case, surrounding spaces, repeated
 * spaces and trailing punctuation, so "  Ctrl + S." matches "ctrl + s". */
export function normalizeShortAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "");
}

function toIdList(response: SubmittedResponse | undefined): string[] {
  if (Array.isArray(response)) return response.filter((v) => typeof v === "string");
  if (typeof response === "string" && response) return [response];
  return [];
}

/** Fraction of a question's points (0–1) earned by one response. */
export function scoreQuestion(
  question: GradableQuestion,
  response: SubmittedResponse | undefined,
): number {
  const type = question.type ?? "SINGLE_CHOICE";

  if (type === "SHORT_ANSWER") {
    if (typeof response !== "string" || !response.trim()) return 0;
    const given = normalizeShortAnswer(response);
    return question.answers.some((a) => a.text && normalizeShortAnswer(a.text) === given) ? 1 : 0;
  }

  // Only ids that really belong to this question count, so an id from a
  // different question can never accidentally match as correct.
  const validIds = new Set(question.answers.map((a) => a.id));
  const chosen = new Set(toIdList(response).filter((id) => validIds.has(id)));

  if (type === "MULTIPLE_CHOICE") {
    const correctIds = question.answers.filter((a) => a.isCorrect).map((a) => a.id);
    if (correctIds.length === 0) return 0;
    // Partial credit: each correct option ticked earns a share, each wrong
    // option ticked takes a share away, never below zero. Ticking every box
    // therefore never beats knowing the answer.
    const hits = correctIds.filter((id) => chosen.has(id)).length;
    const misses = [...chosen].filter((id) => !correctIds.includes(id)).length;
    return Math.max(0, (hits - misses) / correctIds.length);
  }

  // Single choice and true/false: exactly one option, and it must be correct.
  if (chosen.size !== 1) return 0;
  const [only] = [...chosen];
  return question.answers.some((a) => a.id === only && a.isCorrect) ? 1 : 0;
}

/**
 * The actual grading rule, extracted into a pure function so it can be
 * unit-tested directly (see grading.test.ts) rather than only indirectly
 * exercised by hitting a live API route against a real database. Grading
 * happens entirely from data the server already trusts (the quiz's stored
 * correct answers) against the learner's submitted choices — the caller
 * must never pass in anything derived from a client-reported score.
 */
export function gradeQuiz(
  questions: GradableQuestion[],
  submittedAnswers: Record<string, SubmittedResponse>,
  passMarkPercent: number,
): QuizGradeResult {
  let correctCount = 0;
  let pointsEarned = 0;
  let pointsPossible = 0;
  const results: QuestionResult[] = [];

  for (const question of questions) {
    const points = Math.max(0, question.points ?? 1);
    const fraction = scoreQuestion(question, submittedAnswers[question.id]);
    const earned = Math.round(points * fraction * 100) / 100;
    const correct = fraction === 1;
    if (correct) correctCount += 1;
    pointsEarned += earned;
    pointsPossible += points;
    results.push({ questionId: question.id, pointsEarned: earned, pointsPossible: points, correct });
  }

  const totalQuestions = questions.length;
  const scorePercent =
    pointsPossible > 0 ? Math.round((pointsEarned / pointsPossible) * 100) : 0;
  const passed = totalQuestions > 0 && scorePercent >= passMarkPercent;

  return {
    correctCount,
    totalQuestions,
    pointsEarned: Math.round(pointsEarned * 100) / 100,
    pointsPossible,
    scorePercent,
    passed,
    results,
  };
}

/** Letter grade used across the gradebook and learner grade views. */
export function letterGrade(percent: number): string {
  if (percent >= 90) return "A";
  if (percent >= 80) return "B";
  if (percent >= 70) return "C";
  if (percent >= 60) return "D";
  return "F";
}
