import { z } from "zod";
import type { Prisma, Quiz, Question, Answer, QuizAttempt } from "@prisma/client";
import { prisma } from "@/lib/db";
import { gradeQuiz, type SubmittedResponse } from "@/lib/grading";
import { maybeIssueCertificate } from "@/lib/certificates";

// ---- Authoring -----------------------------------------------------------

const answerSchema = z.object({
  text: z.string().trim().min(1, "Every option needs some text."),
  isCorrect: z.boolean(),
});

const questionSchema = z
  .object({
    type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER"]),
    prompt: z.string().trim().min(3, "Each question needs a prompt of at least 3 characters."),
    points: z.number().int().min(1).max(100).default(1),
    explanation: z.string().trim().max(2000).optional().nullable(),
    answers: z.array(answerSchema).min(1),
  })
  .superRefine((q, ctx) => {
    const correct = q.answers.filter((a) => a.isCorrect).length;
    if (q.type === "SHORT_ANSWER") {
      if (q.answers.length < 1) {
        ctx.addIssue({ code: "custom", message: "Add at least one accepted answer." });
      }
      return;
    }
    if (q.answers.length < 2) {
      ctx.addIssue({ code: "custom", message: "Each choice question needs at least 2 options." });
    }
    if (correct === 0) {
      ctx.addIssue({ code: "custom", message: "Every question needs a correct answer marked." });
    }
    if ((q.type === "SINGLE_CHOICE" || q.type === "TRUE_FALSE") && correct > 1) {
      ctx.addIssue({
        code: "custom",
        message: "Single-choice and true/false questions can only have one correct answer.",
      });
    }
  });

export const quizInputSchema = z.object({
  title: z.string().trim().min(2, "Give the quiz a title."),
  description: z.string().trim().max(2000).optional().nullable(),
  moduleId: z.string().optional().nullable(),
  passMarkPercent: z.number().int().min(0).max(100).default(70),
  timeLimitMinutes: z.number().int().min(1).max(600).optional().nullable(),
  maxAttempts: z.number().int().min(1).max(100).optional().nullable(),
  shuffleQuestions: z.boolean().default(false),
  showAnswers: z.boolean().default(true),
  weight: z.number().int().min(0).max(100).default(1),
  questions: z.array(questionSchema).min(1, "Add at least one question."),
});

export type QuizInput = z.infer<typeof quizInputSchema>;

export function questionCreateData(questions: QuizInput["questions"]) {
  return questions.map((q, index) => ({
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    explanation: q.explanation || null,
    order: index,
    answers: {
      create: q.answers.map((a) => ({
        text: a.text,
        // Every listed short answer is an accepted answer.
        isCorrect: q.type === "SHORT_ANSWER" ? true : a.isCorrect,
      })),
    },
  }));
}

export function quizSettingsData(input: QuizInput) {
  return {
    title: input.title,
    description: input.description || null,
    moduleId: input.moduleId || null,
    passMarkPercent: input.passMarkPercent,
    timeLimitMinutes: input.timeLimitMinutes ?? null,
    maxAttempts: input.maxAttempts ?? null,
    shuffleQuestions: input.shuffleQuestions,
    showAnswers: input.showAnswers,
    weight: input.weight,
  };
}

// ---- Taking a quiz -------------------------------------------------------

// Extra time the server allows after the deadline, for network latency on
// slow connections. Beyond it, only autosaved answers are graded.
const SUBMIT_GRACE_MS = 30_000;

type QuestionWithAnswers = Question & { answers: Answer[] };
type QuizWithQuestions = Quiz & { questions: QuestionWithAnswers[] };

export interface LearnerQuestion {
  id: string;
  type: Question["type"];
  prompt: string;
  points: number;
  answers: { id: string; text: string }[];
}

/** Deliberately reshaped — never spread the raw Prisma object, or isCorrect
 * (and short-answer solutions) leak to the browser. */
export function toLearnerQuestions(
  questions: QuestionWithAnswers[],
  order: string[],
): LearnerQuestion[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const ordered = order.length
    ? [
        ...order.map((id) => byId.get(id)).filter((q): q is QuestionWithAnswers => Boolean(q)),
        // Questions added after this attempt started go at the end.
        ...questions.filter((q) => !order.includes(q.id)),
      ]
    : questions;
  return ordered.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    answers: q.type === "SHORT_ANSWER" ? [] : q.answers.map((a) => ({ id: a.id, text: a.text })),
  }));
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function loadQuizWithQuestions(quizId: string): Promise<QuizWithQuestions | null> {
  return prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { include: { answers: { orderBy: { id: "asc" } } }, orderBy: { order: "asc" } },
    },
  });
}

export function attemptsRemaining(quiz: Pick<Quiz, "maxAttempts">, submittedCount: number) {
  return quiz.maxAttempts === null ? null : Math.max(0, quiz.maxAttempts - submittedCount);
}

export type StartResult =
  | { ok: true; attempt: QuizAttempt; questions: LearnerQuestion[] }
  | { ok: false; status: number; error: string };

/** Starts a new attempt, or resumes the learner's unfinished one. Any
 * unfinished attempt whose time ran out is graded first. */
export async function startOrResumeAttempt(
  quiz: QuizWithQuestions,
  learnerId: string,
): Promise<StartResult> {
  const open = await prisma.quizAttempt.findFirst({
    where: { quizId: quiz.id, learnerId, status: "IN_PROGRESS" },
    orderBy: { attemptedAt: "desc" },
  });

  if (open) {
    const expired = open.deadlineAt && open.deadlineAt.getTime() + SUBMIT_GRACE_MS < Date.now();
    if (!expired) {
      return { ok: true, attempt: open, questions: toLearnerQuestions(quiz.questions, open.questionOrder) };
    }
    await finalizeAttempt(quiz, open, null);
  }

  const submittedCount = await prisma.quizAttempt.count({
    where: { quizId: quiz.id, learnerId, status: "SUBMITTED" },
  });
  if (attemptsRemaining(quiz, submittedCount) === 0) {
    return { ok: false, status: 403, error: "You have used all your attempts for this quiz." };
  }
  if (quiz.questions.length === 0) {
    return { ok: false, status: 400, error: "This quiz has no questions yet." };
  }

  const questionOrder = (quiz.shuffleQuestions ? shuffled(quiz.questions) : quiz.questions).map(
    (q) => q.id,
  );
  const now = new Date();
  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      learnerId,
      status: "IN_PROGRESS",
      questionOrder,
      attemptedAt: now,
      deadlineAt: quiz.timeLimitMinutes
        ? new Date(now.getTime() + quiz.timeLimitMinutes * 60_000)
        : null,
      responses: {},
    },
  });
  return { ok: true, attempt, questions: toLearnerQuestions(quiz.questions, questionOrder) };
}

export const responsesSchema = z.record(
  z.string(),
  z.union([z.string().max(1000), z.array(z.string()).max(50)]),
);

export function isPastDeadline(attempt: Pick<QuizAttempt, "deadlineAt">): boolean {
  return Boolean(attempt.deadlineAt && attempt.deadlineAt.getTime() + SUBMIT_GRACE_MS < Date.now());
}

export interface ReviewItem {
  questionId: string;
  type: Question["type"];
  prompt: string;
  points: number;
  pointsEarned: number;
  correct: boolean;
  explanation: string | null;
  options: { id: string; text: string; isCorrect: boolean; chosen: boolean }[];
  response: string | null;
  acceptedAnswers: string[];
}

/** Grades an attempt server-side and stores the result plus a review
 * snapshot. `submitted` is what the learner just sent; pass null (or a
 * late submission) to grade only what was autosaved before the deadline. */
export async function finalizeAttempt(
  quiz: QuizWithQuestions,
  attempt: QuizAttempt,
  submitted: Record<string, SubmittedResponse> | null,
): Promise<QuizAttempt> {
  const saved = (attempt.responses ?? {}) as Record<string, SubmittedResponse>;
  const useSubmitted = submitted !== null && !isPastDeadline(attempt);
  const responses = useSubmitted ? submitted : saved;

  const grade = gradeQuiz(quiz.questions, responses, quiz.passMarkPercent);
  const resultById = new Map(grade.results.map((r) => [r.questionId, r]));
  const order = attempt.questionOrder.length ? attempt.questionOrder : quiz.questions.map((q) => q.id);
  const byId = new Map(quiz.questions.map((q) => [q.id, q]));

  const review: ReviewItem[] = order
    .map((id) => byId.get(id))
    .filter((q): q is QuestionWithAnswers => Boolean(q))
    .map((q) => {
      const response = responses[q.id];
      const chosen = new Set(Array.isArray(response) ? response : response ? [response] : []);
      const result = resultById.get(q.id);
      return {
        questionId: q.id,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        pointsEarned: result?.pointsEarned ?? 0,
        correct: result?.correct ?? false,
        explanation: q.explanation,
        options:
          q.type === "SHORT_ANSWER"
            ? []
            : q.answers.map((a) => ({
                id: a.id,
                text: a.text,
                isCorrect: a.isCorrect,
                chosen: chosen.has(a.id),
              })),
        response: q.type === "SHORT_ANSWER" && typeof response === "string" ? response : null,
        acceptedAnswers: q.type === "SHORT_ANSWER" ? q.answers.map((a) => a.text) : [],
      };
    });

  // Guarded update: if two submits race, only the first one grades.
  const updated = await prisma.quizAttempt.updateMany({
    where: { id: attempt.id, status: "IN_PROGRESS" },
    data: {
      status: "SUBMITTED",
      responses: responses as Prisma.InputJsonValue,
      review: review as unknown as Prisma.InputJsonValue,
      scorePercent: grade.scorePercent,
      pointsEarned: Math.round(grade.pointsEarned),
      pointsPossible: grade.pointsPossible,
      passed: grade.passed,
      submittedAt: new Date(),
    },
  });

  const final = await prisma.quizAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
  if (updated.count > 0 && final.passed) {
    await maybeIssueCertificate(attempt.learnerId, quiz.courseId);
  }
  return final;
}

/** What the learner may see after submitting. When the quiz hides answers,
 * the learner still learns which questions they got right, not the key. */
export function reviewForLearner(review: unknown, showAnswers: boolean): ReviewItem[] {
  const items = Array.isArray(review) ? (review as ReviewItem[]) : [];
  if (showAnswers) return items;
  return items.map((item) => ({
    ...item,
    explanation: null,
    acceptedAnswers: [],
    options: item.options.map((o) => ({ ...o, isCorrect: false })),
  }));
}
