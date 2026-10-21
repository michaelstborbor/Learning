"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { QuizBuilder, emptyQuiz, type QuizDraft } from "./QuizBuilder";

export interface ManagedQuiz extends QuizDraft {
  id: string;
  attemptCount: number;
  passRate: number | null;
}

export function QuizzesManager({
  courseId,
  modules,
  quizzes,
}: {
  courseId: string;
  modules: { id: string; title: string }[];
  quizzes: ManagedQuiz[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<QuizDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function remove(id: string) {
    const res = await fetch(`/api/quiz/${id}`, { method: "DELETE" });
    if (res.ok) {
      setConfirmDelete(null);
      router.refresh();
    }
  }

  const placement = (moduleId: string) => {
    const index = modules.findIndex((m) => m.id === moduleId);
    return index === -1 ? "Final quiz" : `After module ${index + 1}`;
  };

  if (editing) {
    return (
      <QuizBuilder
        key={editing.id ?? "new"}
        courseId={courseId}
        modules={modules}
        initial={editing}
        onClose={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {quizzes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {quizzes.map((quiz) => (
            <li
              key={quiz.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-100 bg-white p-4"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-highlight-100 text-highlight-700">
                <Icon name="quiz" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink-900">{quiz.title}</p>
                <p className="text-xs text-ink-500">
                  {placement(quiz.moduleId)} · {quiz.questions.length} questions · pass {quiz.passMarkPercent}%
                  {quiz.timeLimitMinutes ? ` · ${quiz.timeLimitMinutes} min` : ""}
                  {quiz.maxAttempts ? ` · ${quiz.maxAttempts} attempts` : ""}
                </p>
              </div>
              <Badge tone="neutral">
                {quiz.attemptCount} attempt{quiz.attemptCount === 1 ? "" : "s"}
                {quiz.passRate !== null ? ` · ${quiz.passRate}% pass` : ""}
              </Badge>
              {confirmDelete === quiz.id ? (
                <div className="flex items-center gap-1">
                  <Button variant="danger" className="min-h-9 px-3" onClick={() => remove(quiz.id)}>
                    Delete quiz and its attempts
                  </Button>
                  <Button variant="ghost" className="min-h-9 px-3" onClick={() => setConfirmDelete(null)}>
                    Keep
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Button variant="secondary" className="min-h-9 px-3" onClick={() => setEditing(quiz)}>
                    Edit
                  </Button>
                  <button
                    type="button"
                    className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-danger-500 hover:bg-danger-100"
                    onClick={() => setConfirmDelete(quiz.id)}
                  >
                    <Icon name="trash" size={18} label={`Delete ${quiz.title}`} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Button variant="secondary" className="w-fit" onClick={() => setEditing(emptyQuiz())}>
        <Icon name="plus" size={18} /> New quiz
      </Button>
    </div>
  );
}
