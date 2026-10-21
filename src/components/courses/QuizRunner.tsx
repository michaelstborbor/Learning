"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { ProgressRing } from "@/components/ui/ProgressRing";

type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
type Response = string | string[];

interface QuizInfo {
  id: string;
  title: string;
  description: string | null;
  courseTitle: string;
  moduleTitle: string | null;
  passMarkPercent: number;
  timeLimitMinutes: number | null;
  maxAttempts: number | null;
  questionCount: number;
  totalPoints: number;
  showAnswers: boolean;
}

interface LearnerQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  answers: { id: string; text: string }[];
}

interface ReviewItem {
  questionId: string;
  type: QuestionType;
  prompt: string;
  points: number;
  pointsEarned: number;
  correct: boolean;
  explanation: string | null;
  options: { id: string; text: string; isCorrect: boolean; chosen: boolean }[];
  response: string | null;
  acceptedAnswers: string[];
}

interface AttemptResult {
  id: string;
  scorePercent: number;
  pointsEarned: number;
  pointsPossible: number;
  passed: boolean;
  submittedAt?: string;
  lateSubmission?: boolean;
  review: ReviewItem[];
}

interface ActiveAttempt {
  attemptId: string;
  deadline: number | null; // local clock, ms
  questions: LearnerQuestion[];
}

const TYPE_HINT: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Choose one answer",
  MULTIPLE_CHOICE: "Choose every answer that applies",
  TRUE_FALSE: "True or false?",
  SHORT_ANSWER: "Type your answer",
};

function isAnswered(response: Response | undefined): boolean {
  return Array.isArray(response) ? response.length > 0 : Boolean(response && response.trim());
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  return `${m}:${String(total % 60).padStart(2, "0")}`;
}

function Burst() {
  const dots = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const distance = 70 + (i % 3) * 22;
        return {
          dx: `${Math.cos(angle) * distance}px`,
          dy: `${Math.sin(angle) * distance}px`,
          color: ["#0d9488", "#ea580c", "#2dd4bf", "#fdba74"][i % 4],
          delay: `${(i % 4) * 40}ms`,
        };
      }),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {dots.map((d, i) => (
        <span
          key={i}
          className="burst-dot"
          style={{
            background: d.color,
            animationDelay: d.delay,
            ["--dx" as string]: d.dx,
            ["--dy" as string]: d.dy,
          }}
        />
      ))}
    </div>
  );
}

function ReviewList({ review, showAnswers }: { review: ReviewItem[]; showAnswers: boolean }) {
  return (
    <ol className="flex flex-col gap-3">
      {review.map((item, index) => (
        <li
          key={item.questionId}
          className={clsx(
            "rounded-2xl border bg-white p-4",
            item.correct ? "border-brand-200" : item.pointsEarned > 0 ? "border-highlight-100" : "border-danger-100",
          )}
        >
          <div className="flex items-start gap-3">
            <span
              className={clsx(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full text-white",
                item.correct ? "bg-brand-600" : item.pointsEarned > 0 ? "bg-highlight-500" : "bg-danger-500",
              )}
            >
              <Icon name={item.correct ? "check" : "x"} size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink-900">
                <span className="sr-only">
                  Question {index + 1}, {item.correct ? "correct" : item.pointsEarned > 0 ? "partly correct" : "incorrect"}:{" "}
                </span>
                {item.prompt}
              </p>
              <p className="text-xs tabular-nums text-ink-500">
                {item.pointsEarned} / {item.points} point{item.points === 1 ? "" : "s"}
              </p>

              {item.type === "SHORT_ANSWER" ? (
                <div className="mt-2 text-sm">
                  <p className="text-ink-700">
                    Your answer: <span className="font-medium">{item.response?.trim() || "No answer"}</span>
                  </p>
                  {showAnswers && !item.correct && item.acceptedAnswers.length > 0 && (
                    <p className="text-brand-700">Accepted: {item.acceptedAnswers.join(", ")}</p>
                  )}
                </div>
              ) : (
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {item.options.map((option) => (
                    <li
                      key={option.id}
                      className={clsx(
                        "flex items-center gap-2 rounded-lg px-2 py-1",
                        showAnswers && option.isCorrect && "bg-brand-50 text-brand-800",
                        option.chosen && !(showAnswers && option.isCorrect) && "bg-ink-50",
                      )}
                    >
                      <span className="w-4 shrink-0">
                        {showAnswers && option.isCorrect ? (
                          <Icon name="check" size={16} className="text-brand-600" />
                        ) : option.chosen ? (
                          <span className="block h-2 w-2 rounded-full bg-ink-500" />
                        ) : null}
                      </span>
                      <span className={clsx(option.chosen && "font-medium")}>{option.text}</span>
                      {option.chosen && <span className="ml-auto text-xs text-ink-500">your answer</span>}
                    </li>
                  ))}
                </ul>
              )}

              {showAnswers && item.explanation && (
                <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-700">{item.explanation}</p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function QuizRunner({
  courseId,
  quiz,
  hasOpenAttempt,
  attemptsRemaining,
  history,
}: {
  courseId: string;
  quiz: QuizInfo;
  hasOpenAttempt: boolean;
  attemptsRemaining: number | null;
  history: AttemptResult[];
}) {
  const router = useRouter();
  const [active, setActive] = useState<ActiveAttempt | null>(null);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [current, setCurrent] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [reviewing, setReviewing] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [remaining, setRemaining] = useState(attemptsRemaining);
  const saveTimer = useRef<number | null>(null);
  const submitting = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const best = history.length ? Math.max(...history.map((h) => h.scorePercent)) : null;
  const everPassed = history.some((h) => h.passed);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quiz/${quiz.id}/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't start the quiz.");
        return;
      }
      // Convert the server deadline to this device's clock, so a wrong
      // phone clock doesn't make the countdown lie.
      const skew = Date.now() - new Date(data.serverNow).getTime();
      setActive({
        attemptId: data.attemptId,
        deadline: data.deadlineAt ? new Date(data.deadlineAt).getTime() + skew : null,
        questions: data.questions,
      });
      setResponses(data.responses ?? {});
      setCurrent(0);
      setResult(null);
      setReviewing(null);
      setConfirmSubmit(false);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const persist = useCallback(
    (next: Record<string, Response>) => {
      if (!active) return;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        fetch(`/api/quiz/${quiz.id}/attempt`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId: active.attemptId, answers: next }),
        }).catch(() => {
          // Autosave is best-effort; the final submit sends everything again.
        });
      }, 1200);
    },
    [active, quiz.id],
  );

  function respond(questionId: string, value: Response) {
    setResponses((prev) => {
      const next = { ...prev, [questionId]: value };
      persist(next);
      return next;
    });
  }

  const submit = useCallback(async () => {
    if (!active || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    try {
      const res = await fetch(`/api/quiz/${quiz.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: active.attemptId, answers: responses }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResult(data);
      setRemaining(data.attemptsRemaining);
      setActive(null);
      router.refresh();
      window.scrollTo({ top: 0 });
      requestAnimationFrame(() => headingRef.current?.focus());
    } catch {
      setError("Couldn't reach the server. Your answers are saved; try submitting again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }, [active, quiz.id, responses, router]);

  // Countdown, plus automatic submission when time runs out. The latest
  // submit is read through a ref so the timer isn't restarted on every answer.
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);
  useEffect(() => {
    const deadline = active?.deadline;
    if (!deadline) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= deadline) {
        window.clearInterval(id);
        submitRef.current();
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [active?.deadline]);

  const timeLeft = active?.deadline ? active.deadline - now : null;

  // ---- Result screen -------------------------------------------------------
  if (result || reviewing) {
    const shown = (result ?? reviewing)!;
    const isFresh = Boolean(result);
    const canRetake = remaining === null || remaining > 0;
    return (
      <div className="flex flex-col gap-8">
        <div className="relative overflow-hidden rounded-3xl border border-ink-100 bg-white p-6 text-center shadow-raised sm:p-10">
          {isFresh && shown.passed && <Burst />}
          <div className="relative mx-auto w-fit">
            <ProgressRing
              value={shown.scorePercent}
              size={148}
              stroke={12}
              tone={shown.passed ? "brand" : "highlight"}
              animate={isFresh}
              label={`Score ${shown.scorePercent}%`}
            >
              <span>
                <span className="block font-display text-4xl font-bold tabular-nums text-ink-900">
                  {shown.scorePercent}%
                </span>
                <span className="block text-xs tabular-nums text-ink-500">
                  {shown.pointsEarned}/{shown.pointsPossible} points
                </span>
              </span>
            </ProgressRing>
          </div>
          <h1 ref={headingRef} tabIndex={-1} className="mt-6 font-display text-2xl font-bold text-ink-900 outline-none sm:text-3xl">
            {shown.passed ? "Passed" : "Not passed yet"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-ink-500">
            {shown.passed
              ? `You cleared the ${quiz.passMarkPercent}% pass mark. This counts towards your course grade and certificate.`
              : `The pass mark is ${quiz.passMarkPercent}%. Go through the review below, revisit the lessons, then try again.`}
          </p>
          {shown.lateSubmission && (
            <p className="mx-auto mt-3 max-w-md text-sm text-highlight-700">
              Time ran out before your answers arrived, so the answers saved before the deadline were graded.
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={`/learn/${courseId}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand-400 px-4 text-sm font-semibold text-brand-600 hover:bg-brand-50"
            >
              Back to course
            </Link>
            {canRetake ? (
              <Button onClick={start} disabled={busy}>
                <Icon name="refresh" size={18} /> {shown.passed ? "Try for a higher score" : "Try again"}
              </Button>
            ) : (
              <p className="inline-flex min-h-11 items-center text-sm text-ink-500">No attempts left</p>
            )}
          </div>
          {remaining !== null && canRetake && (
            <p className="mt-3 text-xs text-ink-500">
              {remaining} attempt{remaining === 1 ? "" : "s"} left
            </p>
          )}
          {error && (
            <div className="mt-4 text-left">
              <Alert tone="danger" title={error} />
            </div>
          )}
        </div>

        {shown.review.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-semibold text-ink-900">Review your answers</h2>
            {!quiz.showAnswers && (
              <p className="mt-1 text-sm text-ink-500">
                Your instructor has chosen not to show the correct answers for this quiz.
              </p>
            )}
            <div className="mt-4">
              <ReviewList review={shown.review} showAnswers={quiz.showAnswers} />
            </div>
          </section>
        )}
        {!isFresh && (
          <Button variant="ghost" className="w-fit" onClick={() => setReviewing(null)}>
            <Icon name="chevronLeft" size={16} /> Back to quiz overview
          </Button>
        )}
      </div>
    );
  }

  // ---- Taking the quiz -----------------------------------------------------
  if (active) {
    const question = active.questions[current];
    const answeredCount = active.questions.filter((q) => isAnswered(responses[q.id])).length;
    const unanswered = active.questions.length - answeredCount;
    const response = responses[question.id];
    const lowTime = timeLeft !== null && timeLeft < 60_000;

    return (
      <div className="flex flex-col gap-6">
        <div className="sticky top-[61px] z-20 -mx-4 border-b border-ink-100 bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate font-display font-semibold text-ink-900">{quiz.title}</p>
            {timeLeft !== null && (
              <p
                className={clsx(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1 font-display font-bold tabular-nums",
                  lowTime ? "bg-danger-100 text-danger-700" : "bg-white text-ink-900",
                )}
                role="timer"
                aria-live={lowTime ? "assertive" : "off"}
              >
                <Icon name="clock" size={16} /> {formatClock(timeLeft)}
              </p>
            )}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-300"
              style={{ width: `${(answeredCount / active.questions.length) * 100}%` }}
            />
          </div>
        </div>

        <nav aria-label="Questions" className="flex flex-wrap gap-2">
          {active.questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrent(i)}
              aria-current={i === current ? "step" : undefined}
              className={clsx(
                "grid h-10 w-10 cursor-pointer place-items-center rounded-lg font-display text-sm font-semibold transition-colors",
                i === current
                  ? "bg-ink-900 text-white"
                  : isAnswered(responses[q.id])
                    ? "bg-brand-100 text-brand-800 hover:bg-brand-200"
                    : "border border-ink-200 bg-white text-ink-500 hover:border-brand-400",
              )}
            >
              <span className="sr-only">Question </span>
              {i + 1}
              {isAnswered(responses[q.id]) && <span className="sr-only"> (answered)</span>}
            </button>
          ))}
        </nav>

        <fieldset key={question.id} className="rise-in rounded-3xl border border-ink-100 bg-white p-5 shadow-raised sm:p-8">
          <legend className="sr-only">Question {current + 1}</legend>
          <p className="text-sm text-ink-500">
            Question {current + 1} of {active.questions.length} · {question.points} point
            {question.points === 1 ? "" : "s"} · {TYPE_HINT[question.type]}
          </p>
          <p className="mt-2 font-display text-xl font-semibold text-ink-900 sm:text-2xl">{question.prompt}</p>

          <div className="mt-6 flex flex-col gap-3">
            {question.type === "SHORT_ANSWER" ? (
              <>
                <label htmlFor={`answer-${question.id}`} className="sr-only">
                  Your answer
                </label>
                <input
                  id={`answer-${question.id}`}
                  type="text"
                  autoComplete="off"
                  value={typeof response === "string" ? response : ""}
                  onChange={(e) => respond(question.id, e.target.value)}
                  className="min-h-12 rounded-xl border-2 border-ink-200 px-4 text-base outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-100"
                  placeholder="Type your answer"
                />
              </>
            ) : (
              question.answers.map((answer, i) => {
                const multiple = question.type === "MULTIPLE_CHOICE";
                const chosen = multiple
                  ? Array.isArray(response) && response.includes(answer.id)
                  : response === answer.id;
                return (
                  <label
                    key={answer.id}
                    className={clsx(
                      "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-base transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400 has-[:focus-visible]:ring-offset-2",
                      chosen
                        ? "border-brand-500 bg-brand-50 text-ink-900"
                        : "border-ink-100 text-ink-700 hover:border-brand-300 hover:bg-brand-50/40",
                    )}
                  >
                    <input
                      type={multiple ? "checkbox" : "radio"}
                      name={question.id}
                      value={answer.id}
                      checked={chosen}
                      className="sr-only"
                      onChange={() => {
                        if (!multiple) return respond(question.id, answer.id);
                        const list = Array.isArray(response) ? response : [];
                        respond(
                          question.id,
                          list.includes(answer.id) ? list.filter((id) => id !== answer.id) : [...list, answer.id],
                        );
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className={clsx(
                        "grid h-8 w-8 shrink-0 place-items-center font-display text-sm font-bold",
                        multiple ? "rounded-lg" : "rounded-full",
                        chosen ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500",
                      )}
                    >
                      {chosen ? <Icon name="check" size={16} /> : String.fromCharCode(65 + i)}
                    </span>
                    {answer.text}
                  </label>
                );
              })
            )}
          </div>
        </fieldset>

        {error && <Alert tone="danger" title={error} />}

        {confirmSubmit && unanswered > 0 && (
          <Alert tone="info" title={`${unanswered} question${unanswered === 1 ? " is" : "s are"} still unanswered`}>
            Unanswered questions score zero. Submit anyway, or go back and answer them.
          </Alert>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
            <Icon name="chevronLeft" size={16} /> Previous
          </Button>
          <div className="flex flex-wrap gap-2">
            {current < active.questions.length - 1 && (
              <Button variant="secondary" onClick={() => setCurrent((c) => c + 1)}>
                Next <Icon name="chevronRight" size={16} />
              </Button>
            )}
            <Button
              onClick={() => (unanswered > 0 && !confirmSubmit ? setConfirmSubmit(true) : submit())}
              disabled={busy}
            >
              {busy ? "Submitting…" : confirmSubmit && unanswered > 0 ? "Submit anyway" : "Submit quiz"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Overview ------------------------------------------------------------
  const outOfAttempts = remaining === 0;
  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-raised sm:p-8">
        <Link
          href={`/learn/${courseId}`}
          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
        >
          <Icon name="chevronLeft" size={16} /> {quiz.courseTitle}
        </Link>
        <p className="mt-4 text-sm font-medium text-highlight-700">
          {quiz.moduleTitle ? `Module quiz: ${quiz.moduleTitle}` : "Final quiz"}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ink-900">{quiz.title}</h1>
        {quiz.description && <p className="mt-3 max-w-prose whitespace-pre-wrap text-ink-700">{quiz.description}</p>}

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Questions", value: String(quiz.questionCount) },
            { label: "Pass mark", value: `${quiz.passMarkPercent}%` },
            { label: "Time limit", value: quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : "None" },
            {
              label: "Attempts left",
              value: remaining === null ? "Unlimited" : String(remaining),
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-ink-50 px-3 py-3">
              <dt className="text-xs text-ink-500">{item.label}</dt>
              <dd className="font-display text-lg font-bold tabular-nums text-ink-900">{item.value}</dd>
            </div>
          ))}
        </dl>

        {quiz.timeLimitMinutes && (
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-500">
            <Icon name="clock" size={16} /> The timer starts when you press start and keeps running if you leave
            the page. Answers save as you go.
          </p>
        )}

        {error && (
          <div className="mt-4">
            <Alert tone="danger" title={error} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {outOfAttempts && !hasOpenAttempt ? (
            <p className="text-sm text-ink-500">You&apos;ve used every attempt for this quiz.</p>
          ) : (
            <Button onClick={start} disabled={busy || quiz.questionCount === 0} className="px-6">
              <Icon name="play" size={16} />
              {busy ? "Starting…" : hasOpenAttempt ? "Resume attempt" : history.length ? "Start a new attempt" : "Start quiz"}
            </Button>
          )}
          {best !== null && (
            <p className="text-sm text-ink-500">
              Best score <span className={clsx("font-semibold", everPassed ? "text-brand-700" : "text-ink-900")}>{best}%</span>
              {everPassed ? " · passed" : ""}
            </p>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold text-ink-900">Your attempts</h2>
          <ul className="mt-3 divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white">
            {history.map((attempt, i) => (
              <li key={attempt.id} className="flex items-center gap-3 px-4 py-3">
                <ProgressRing value={attempt.scorePercent} size={44} stroke={5} tone={attempt.passed ? "brand" : "highlight"}>
                  <span className="text-[11px] font-bold tabular-nums text-ink-900">{attempt.scorePercent}</span>
                </ProgressRing>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink-900">
                    Attempt {history.length - i} · {attempt.passed ? "Passed" : "Not passed"}
                  </p>
                  <p className="text-xs text-ink-500">
                    {attempt.pointsEarned}/{attempt.pointsPossible} points ·{" "}
                    {new Date(attempt.submittedAt!).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                {attempt.review.length > 0 && (
                  <Button variant="ghost" className="min-h-9 px-3" onClick={() => setReviewing(attempt)}>
                    Review
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
