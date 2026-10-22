// Shape of a course written as code, so finished courses can be reviewed
// in a pull request and installed the same way on every environment.

export type PackQuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";

export interface PackQuestion {
  type: PackQuestionType;
  prompt: string;
  // For choice questions, the options shown. For SHORT_ANSWER, the accepted answers.
  options: string[];
  // Indexes into options that are correct (every option for SHORT_ANSWER).
  correct: number[];
  explanation: string;
}

export interface PackQuiz {
  title: string;
  description: string;
  timeLimitMinutes?: number;
  questions: PackQuestion[];
}

export interface CoursePack {
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  durationMinutes: number;
  skill: { name: string; category: string };
  modules: { title: string; lessons: { title: string; content: string }[]; quiz?: PackQuiz }[];
  finalQuiz?: PackQuiz;
  project?: { title: string; instructions: string; rubric: string };
}
