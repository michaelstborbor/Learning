"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

interface AnswerDraft {
  text: string;
  isCorrect: boolean;
}
interface QuestionDraft {
  prompt: string;
  answers: AnswerDraft[];
}

interface ExistingQuiz {
  title: string;
  passMarkPercent: number;
  questions: { prompt: string; answers: { text: string; isCorrect: boolean }[] }[];
}

function emptyQuestion(): QuestionDraft {
  return {
    prompt: "",
    answers: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ],
  };
}

export function QuizBuilder({
  courseId,
  existingQuiz,
}: {
  courseId: string;
  existingQuiz: ExistingQuiz | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(existingQuiz?.title ?? "");
  const [passMarkPercent, setPassMarkPercent] = useState(existingQuiz?.passMarkPercent ?? 70);
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    existingQuiz?.questions ?? [emptyQuestion()],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateAnswer(qIndex: number, aIndex: number, patch: Partial<AnswerDraft>) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i !== qIndex
          ? q
          : {
              ...q,
              answers: q.answers.map((a, j) => (j === aIndex ? { ...a, ...patch } : a)),
            },
      ),
    );
  }

  function setCorrectAnswer(qIndex: number, aIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i !== qIndex
          ? q
          : { ...q, answers: q.answers.map((a, j) => ({ ...a, isCorrect: j === aIndex })) },
      ),
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/quiz`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, passMarkPercent, questions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-ink-100 p-4">
      {error && <Alert tone="danger" title={error} />}
      {saved && <Alert tone="success" title="Quiz saved" />}

      <div className="grid grid-cols-2 gap-4">
        <Field id="quizTitle" label="Quiz title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Field
          id="passMark"
          label="Pass mark (%)"
          type="number"
          min={0}
          max={100}
          value={passMarkPercent}
          onChange={(e) => setPassMarkPercent(Number(e.target.value))}
        />
      </div>

      <div className="flex flex-col gap-4">
        {questions.map((question, qIndex) => (
          <div key={qIndex} className="rounded-md border border-ink-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <Field
                  id={`q-${qIndex}`}
                  label={`Question ${qIndex + 1}`}
                  value={question.prompt}
                  onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                />
              </div>
              {questions.length > 1 && (
                <button
                  type="button"
                  className="mt-6 text-sm text-danger-500 hover:underline"
                  onClick={() =>
                    setQuestions((prev) => prev.filter((_, i) => i !== qIndex))
                  }
                >
                  Remove
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {question.answers.map((answer, aIndex) => (
                <div key={aIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qIndex}`}
                    checked={answer.isCorrect}
                    onChange={() => setCorrectAnswer(qIndex, aIndex)}
                    title="Mark as correct answer"
                  />
                  <input
                    type="text"
                    className="flex-1 rounded-md border border-ink-300 px-3 py-1.5 text-sm outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
                    placeholder={`Option ${aIndex + 1}`}
                    value={answer.text}
                    onChange={(e) => updateAnswer(qIndex, aIndex, { text: e.target.value })}
                  />
                  {question.answers.length > 2 && (
                    <button
                      type="button"
                      className="text-xs text-danger-500 hover:underline"
                      onClick={() =>
                        updateQuestion(qIndex, {
                          answers: question.answers.filter((_, j) => j !== aIndex),
                        })
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="text-left text-xs text-brand-600 hover:underline"
                onClick={() =>
                  updateQuestion(qIndex, {
                    answers: [...question.answers, { text: "", isCorrect: false }],
                  })
                }
              >
                + Add option
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
        >
          + Add question
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save quiz"}
        </Button>
      </div>
    </div>
  );
}
