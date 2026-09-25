export interface GradableAnswer {
  id: string;
  isCorrect: boolean;
}

export interface GradableQuestion {
  id: string;
  answers: GradableAnswer[];
}

export interface QuizGradeResult {
  correctCount: number;
  totalQuestions: number;
  scorePercent: number;
  passed: boolean;
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
  submittedAnswers: Record<string, string>,
  passMarkPercent: number,
): QuizGradeResult {
  let correctCount = 0;
  for (const question of questions) {
    const chosenAnswerId = submittedAnswers[question.id];
    const correctAnswer = question.answers.find((a) => a.isCorrect);
    if (chosenAnswerId && correctAnswer && chosenAnswerId === correctAnswer.id) {
      correctCount += 1;
    }
  }

  const totalQuestions = questions.length;
  const scorePercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = scorePercent >= passMarkPercent;

  return { correctCount, totalQuestions, scorePercent, passed };
}
