"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";

interface QuizData {
  id: string;
  title: string;
  passMarkPercent: number;
  questions: { id: string; prompt: string; answers: { id: string; text: string }[] }[];
}

interface AttemptResult {
  scorePercent: number;
  passed: boolean;
}

export function QuizRunner({
  quizId,
  courseId,
  previousAttempts,
}: {
  quizId: string;
  courseId: string;
  previousAttempts: AttemptResult[];
}) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/quiz/${quizId}`)
      .then((res) => res.json())
      .then(setQuiz)
      .catch(() => setError("Couldn't load the quiz. Please try again."));
  }, [quizId]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quiz/${quizId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: selections }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResult({ scorePercent: data.scorePercent, passed: data.passed });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !quiz) return <Alert tone="danger" title={error} />;
  if (!quiz) return <p className="text-sm text-ink-500">Loading quiz…</p>;

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-bold text-ink-900">{quiz.title}</h1>
        <Alert
          tone={result.passed ? "success" : "danger"}
          title={
            result.passed
              ? `Passed — ${result.scorePercent}%`
              : `Not passed — ${result.scorePercent}% (need ${quiz.passMarkPercent}%)`
          }
        >
          {result.passed
            ? "Nice work. This is recorded on your progress."
            : "You can try again — review the lessons and retake the quiz."}
        </Alert>
        <div className="flex gap-3">
          <Link href={`/learn/${courseId}`}>
            <Button variant="ghost">Back to course</Button>
          </Link>
          {!result.passed && (
            <Button
              onClick={() => {
                setResult(null);
                setSelections({});
              }}
            >
              Retake quiz
            </Button>
          )}
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(selections).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">{quiz.title}</h1>
        <p className="mt-1 text-sm text-ink-500">
          Pass mark: {quiz.passMarkPercent}%
          {previousAttempts.length > 0 && (
            <>
              {" · Best so far: "}
              <Badge tone={previousAttempts.some((a) => a.passed) ? "verified" : "brand"}>
                {Math.max(...previousAttempts.map((a) => a.scorePercent))}%
              </Badge>
            </>
          )}
        </p>
      </div>

      {error && <Alert tone="danger" title={error} />}

      <div className="flex flex-col gap-6">
        {quiz.questions.map((question, index) => (
          <fieldset key={question.id} className="rounded-md border border-ink-100 p-4">
            <legend className="px-1 text-sm font-medium text-ink-900">
              {index + 1}. {question.prompt}
            </legend>
            <div className="mt-2 flex flex-col gap-2">
              {question.answers.map((answer) => (
                <label
                  key={answer.id}
                  className="flex items-center gap-2 text-sm text-ink-700"
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={answer.id}
                    checked={selections[question.id] === answer.id}
                    onChange={() =>
                      setSelections((prev) => ({ ...prev, [question.id]: answer.id }))
                    }
                  />
                  {answer.text}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={submitting || answeredCount < quiz.questions.length}
      >
        {submitting
          ? "Submitting…"
          : `Submit quiz (${answeredCount}/${quiz.questions.length} answered)`}
      </Button>
    </div>
  );
}
