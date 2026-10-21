"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";

type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";

interface AnswerDraft {
  text: string;
  isCorrect: boolean;
}

export interface QuestionDraft {
  type: QuestionType;
  prompt: string;
  points: number;
  explanation: string;
  answers: AnswerDraft[];
}

export interface QuizDraft {
  id?: string;
  title: string;
  description: string;
  moduleId: string;
  passMarkPercent: number;
  timeLimitMinutes: number | null;
  maxAttempts: number | null;
  shuffleQuestions: boolean;
  showAnswers: boolean;
  weight: number;
  questions: QuestionDraft[];
}

const TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_CHOICE: "Multiple answers",
  TRUE_FALSE: "True / false",
  SHORT_ANSWER: "Short answer",
};

const TYPE_HINT: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Learners pick one option. Mark the correct one.",
  MULTIPLE_CHOICE: "Learners tick every option that applies. Partial credit is given.",
  TRUE_FALSE: "Mark whether the statement is true or false.",
  SHORT_ANSWER: "Learners type an answer. List every answer you accept; case and spacing are ignored.",
};

function answersFor(type: QuestionType, previous?: AnswerDraft[]): AnswerDraft[] {
  if (type === "TRUE_FALSE") {
    return [
      { text: "True", isCorrect: true },
      { text: "False", isCorrect: false },
    ];
  }
  if (type === "SHORT_ANSWER") return [{ text: "", isCorrect: true }];
  const kept = previous && previous.length >= 2 && previous[0].text !== "True" ? previous : null;
  return (
    kept ?? [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ]
  );
}

function emptyQuestion(type: QuestionType = "SINGLE_CHOICE"): QuestionDraft {
  return { type, prompt: "", points: 1, explanation: "", answers: answersFor(type) };
}

export function emptyQuiz(): QuizDraft {
  return {
    title: "",
    description: "",
    moduleId: "",
    passMarkPercent: 70,
    timeLimitMinutes: null,
    maxAttempts: null,
    shuffleQuestions: false,
    showAnswers: true,
    weight: 1,
    questions: [emptyQuestion()],
  };
}

const inputClass =
  "min-h-11 w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-base text-ink-900 outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100 sm:text-sm";

export function QuizBuilder({
  courseId,
  modules,
  initial,
  onClose,
}: {
  courseId: string;
  modules: { id: string; title: string }[];
  initial: QuizDraft;
  onClose: () => void;
}) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizDraft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0);

  function patch(next: Partial<QuizDraft>) {
    setQuiz((prev) => ({ ...prev, ...next }));
  }

  function updateQuestion(index: number, next: Partial<QuestionDraft>) {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? { ...q, ...next } : q)),
    }));
  }

  function updateAnswer(qIndex: number, aIndex: number, next: Partial<AnswerDraft>) {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i !== qIndex ? q : { ...q, answers: q.answers.map((a, j) => (j === aIndex ? { ...a, ...next } : a)) },
      ),
    }));
  }

  function markCorrect(qIndex: number, aIndex: number) {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== qIndex) return q;
        if (q.type === "MULTIPLE_CHOICE") {
          return { ...q, answers: q.answers.map((a, j) => (j === aIndex ? { ...a, isCorrect: !a.isCorrect } : a)) };
        }
        return { ...q, answers: q.answers.map((a, j) => ({ ...a, isCorrect: j === aIndex })) };
      }),
    }));
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    setQuiz((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.questions.length) return prev;
      const questions = [...prev.questions];
      [questions[index], questions[target]] = [questions[target], questions[index]];
      return { ...prev, questions };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(quiz.id ? `/api/quiz/${quiz.id}` : `/api/courses/${courseId}/quizzes`, {
        method: quiz.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...quiz,
          moduleId: quiz.moduleId || null,
          description: quiz.description || null,
          questions: quiz.questions.map((q) => ({
            ...q,
            explanation: q.explanation || null,
            answers: q.answers.filter((a) => a.text.trim()),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rise-in flex flex-col gap-6 rounded-xl border border-brand-200 bg-white p-4 shadow-raised sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-ink-900">
          {quiz.id ? "Edit quiz" : "New quiz"}
        </h3>
        <p className="text-sm text-ink-500">
          {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"} · {totalPoints} point
          {totalPoints === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="quizTitle" label="Quiz title" value={quiz.title} onChange={(e) => patch({ title: e.target.value })} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quizModule" className="text-sm font-medium text-ink-700">
            Where it appears
          </label>
          <select
            id="quizModule"
            className={inputClass}
            value={quiz.moduleId}
            onChange={(e) => patch({ moduleId: e.target.value })}
          >
            <option value="">End of course (final quiz)</option>
            {modules.map((m, i) => (
              <option key={m.id} value={m.id}>
                After module {i + 1}: {m.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="quizDescription" className="text-sm font-medium text-ink-700">
            Instructions for learners (optional)
          </label>
          <textarea
            id="quizDescription"
            className={clsx(inputClass, "min-h-20")}
            value={quiz.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </div>
      </div>

      <fieldset className="grid gap-4 rounded-xl bg-ink-50 p-4 sm:grid-cols-4">
        <legend className="sr-only">Quiz settings</legend>
        <Field
          id="passMark"
          label="Pass mark (%)"
          type="number"
          min={0}
          max={100}
          value={quiz.passMarkPercent}
          onChange={(e) => patch({ passMarkPercent: Number(e.target.value) })}
        />
        <Field
          id="timeLimit"
          label="Time limit (min)"
          type="number"
          min={1}
          placeholder="None"
          value={quiz.timeLimitMinutes ?? ""}
          onChange={(e) => patch({ timeLimitMinutes: e.target.value ? Number(e.target.value) : null })}
        />
        <Field
          id="maxAttempts"
          label="Attempts allowed"
          type="number"
          min={1}
          placeholder="Unlimited"
          value={quiz.maxAttempts ?? ""}
          onChange={(e) => patch({ maxAttempts: e.target.value ? Number(e.target.value) : null })}
        />
        <Field
          id="weight"
          label="Weight in course grade"
          type="number"
          min={0}
          value={quiz.weight}
          onChange={(e) => patch({ weight: Number(e.target.value) })}
        />
        <label className="flex items-center gap-2 text-sm text-ink-700 sm:col-span-2">
          <input
            type="checkbox"
            className="h-5 w-5 accent-brand-600"
            checked={quiz.shuffleQuestions}
            onChange={(e) => patch({ shuffleQuestions: e.target.checked })}
          />
          Shuffle question order for each attempt
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-700 sm:col-span-2">
          <input
            type="checkbox"
            className="h-5 w-5 accent-brand-600"
            checked={quiz.showAnswers}
            onChange={(e) => patch({ showAnswers: e.target.checked })}
          />
          Show correct answers and explanations after submitting
        </label>
      </fieldset>

      <ol className="flex flex-col gap-4">
        {quiz.questions.map((question, qIndex) => (
          <li key={qIndex} className="rounded-xl border border-ink-100 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 font-display text-sm font-bold text-white">
                {qIndex + 1}
              </span>
              <select
                aria-label={`Question ${qIndex + 1} type`}
                className="min-h-9 rounded-lg border border-ink-300 bg-white px-2 text-sm"
                value={question.type}
                onChange={(e) => {
                  const type = e.target.value as QuestionType;
                  updateQuestion(qIndex, { type, answers: answersFor(type, question.answers) });
                }}
              >
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-sm text-ink-700">
                <input
                  type="number"
                  min={1}
                  max={100}
                  aria-label={`Question ${qIndex + 1} points`}
                  className="min-h-9 w-16 rounded-lg border border-ink-300 px-2 text-sm"
                  value={question.points}
                  onChange={(e) => updateQuestion(qIndex, { points: Number(e.target.value) })}
                />
                points
              </label>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                  disabled={qIndex === 0}
                  onClick={() => moveQuestion(qIndex, -1)}
                >
                  <Icon name="chevronLeft" className="rotate-90" label="Move up" />
                </button>
                <button
                  type="button"
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                  disabled={qIndex === quiz.questions.length - 1}
                  onClick={() => moveQuestion(qIndex, 1)}
                >
                  <Icon name="chevronRight" className="rotate-90" label="Move down" />
                </button>
                {quiz.questions.length > 1 && (
                  <button
                    type="button"
                    className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-danger-500 hover:bg-danger-100"
                    onClick={() => patch({ questions: quiz.questions.filter((_, i) => i !== qIndex) })}
                  >
                    <Icon name="trash" size={18} label={`Remove question ${qIndex + 1}`} />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
              <label htmlFor={`q-${qIndex}`} className="text-sm font-medium text-ink-700">
                Question
              </label>
              <textarea
                id={`q-${qIndex}`}
                className={clsx(inputClass, "min-h-16")}
                value={question.prompt}
                onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
              />
              <p className="text-xs text-ink-500">{TYPE_HINT[question.type]}</p>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {question.answers.map((answer, aIndex) => (
                <div key={aIndex} className="flex items-center gap-2">
                  {question.type !== "SHORT_ANSWER" && (
                    <input
                      type={question.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                      name={`correct-${qIndex}`}
                      className="h-5 w-5 shrink-0 accent-verified-500"
                      checked={answer.isCorrect}
                      onChange={() => markCorrect(qIndex, aIndex)}
                      aria-label={`Option ${aIndex + 1} is correct`}
                    />
                  )}
                  <input
                    type="text"
                    className={clsx(inputClass, answer.isCorrect && question.type !== "SHORT_ANSWER" && "border-verified-500")}
                    placeholder={question.type === "SHORT_ANSWER" ? `Accepted answer ${aIndex + 1}` : `Option ${aIndex + 1}`}
                    value={answer.text}
                    readOnly={question.type === "TRUE_FALSE"}
                    onChange={(e) => updateAnswer(qIndex, aIndex, { text: e.target.value })}
                  />
                  {question.type !== "TRUE_FALSE" &&
                    question.answers.length > (question.type === "SHORT_ANSWER" ? 1 : 2) && (
                      <button
                        type="button"
                        className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-500 hover:bg-ink-100"
                        onClick={() =>
                          updateQuestion(qIndex, { answers: question.answers.filter((_, j) => j !== aIndex) })
                        }
                      >
                        <Icon name="x" size={18} label={`Remove option ${aIndex + 1}`} />
                      </button>
                    )}
                </div>
              ))}
              {question.type !== "TRUE_FALSE" && (
                <button
                  type="button"
                  className="inline-flex w-fit cursor-pointer items-center gap-1 rounded-md py-1 text-sm font-medium text-brand-600 hover:underline"
                  onClick={() =>
                    updateQuestion(qIndex, {
                      answers: [...question.answers, { text: "", isCorrect: question.type === "SHORT_ANSWER" }],
                    })
                  }
                >
                  <Icon name="plus" size={16} />
                  {question.type === "SHORT_ANSWER" ? "Add another accepted answer" : "Add option"}
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
              <label htmlFor={`exp-${qIndex}`} className="text-sm font-medium text-ink-700">
                Explanation shown after submitting (optional)
              </label>
              <input
                id={`exp-${qIndex}`}
                className={inputClass}
                value={question.explanation}
                onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
              />
            </div>
          </li>
        ))}
      </ol>

      {error && <Alert tone="danger" title={error} />}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => patch({ questions: [...quiz.questions, emptyQuestion(quiz.questions.at(-1)?.type)] })}
        >
          <Icon name="plus" size={18} /> Add question
        </Button>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save quiz"}
          </Button>
        </div>
      </div>
    </div>
  );
}
