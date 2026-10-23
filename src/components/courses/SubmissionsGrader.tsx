"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { safeHref } from "@/lib/validation";
import { PROJECT_PASS_PERCENT, type CheckedCriterion } from "@/lib/rubric-score";

interface GradableSubmission {
  id: string;
  learnerName: string;
  submissionUrl: string | null;
  fileName: string | null;
  notes: string | null;
  submittedAt: string;
  status: "PENDING" | "GRADED";
  score: number | null;
  feedback: string | null;
  autoGradeStatus: string | null;
  autoGradeNote: string | null;
  autoGradeStuck: boolean;
  criteria: CheckedCriterion[] | null;
}

const RESULT_LABEL: Record<CheckedCriterion["result"], string> = {
  met: "Met",
  partly_met: "Partly met",
  not_met: "Not met",
  cannot_check: "Couldn't check from the file",
};

const RESULT_MARK: Record<CheckedCriterion["result"], string> = {
  met: "✓",
  partly_met: "◐",
  not_met: "✗",
  cannot_check: "–",
};

export function SubmissionsGrader({
  submissions,
  canRetryAutoGrade,
}: {
  submissions: GradableSubmission[];
  canRetryAutoGrade: boolean;
}) {
  const pending = submissions.filter((s) => s.status === "PENDING");
  const autoGraded = submissions.filter((s) => s.status === "GRADED");

  return (
    <div className="flex flex-col gap-6">
      {pending.length === 0 ? (
        <p className="text-sm text-ink-500">No submissions waiting to be graded.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {pending.map((submission) => (
            <GradeCard key={submission.id} submission={submission} canRetryAutoGrade={canRetryAutoGrade} />
          ))}
        </div>
      )}

      {autoGraded.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold text-ink-900">Graded automatically</h3>
          <p className="-mt-2 text-sm text-ink-500">
            Check each rubric result. If you disagree, change the grade and the learner sees yours instead.
          </p>
          {autoGraded.map((submission) => (
            <GradeCard key={submission.id} submission={submission} canRetryAutoGrade={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionLinks({ submission }: { submission: GradableSubmission }) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {submission.fileName && (
        <a
          href={`/api/submissions/${submission.id}/file`}
          className="inline-flex min-h-11 items-center gap-1.5 text-brand-600 hover:underline"
        >
          <Icon name="download" size={16} />
          <span className="break-all">Download {submission.fileName}</span>
        </a>
      )}
      {safeHref(submission.submissionUrl) && (
        <a
          href={safeHref(submission.submissionUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center text-brand-600 hover:underline"
        >
          View link
        </a>
      )}
    </div>
  );
}

function CriteriaList({ criteria }: { criteria: CheckedCriterion[] }) {
  return (
    <ul className="mt-3 flex flex-col gap-2 rounded-lg bg-ink-50 p-3 text-sm">
      {criteria.map((c, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="w-4 shrink-0 text-center font-semibold text-ink-700">
            {RESULT_MARK[c.result]}
          </span>
          <div className="min-w-0">
            <p className="break-words text-ink-900">
              {c.criterion}
              {c.neededToPass && <span className="text-ink-500"> (needed to pass)</span>}
            </p>
            <p className="break-words text-ink-500">
              <span className="font-medium text-ink-700">{RESULT_LABEL[c.result]}.</span> {c.evidence}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function GradeCard({
  submission,
  canRetryAutoGrade,
}: {
  submission: GradableSubmission;
  canRetryAutoGrade: boolean;
}) {
  const router = useRouter();
  const isGraded = submission.status === "GRADED";
  const [editing, setEditing] = useState(!isGraded);
  const [score, setScore] = useState(submission.score ?? 70);
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const running = submission.autoGradeStatus === "RUNNING" && !submission.autoGradeStuck;

  async function handleGrade() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${submission.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, feedback }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetry() {
    setRetrying(true);
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${submission.id}/auto-grade`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } finally {
      setRetrying(false);
    }
  }

  const passed = (submission.score ?? 0) >= PROJECT_PASS_PERCENT;

  return (
    <div className="rounded-md border border-ink-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-ink-900">{submission.learnerName}</p>
        {isGraded ? (
          <Badge tone={passed ? "verified" : "danger"}>
            {passed ? "Passed" : "Not yet passed"}, {submission.score}% (automatic)
          </Badge>
        ) : running ? (
          <Badge tone="brand">Being marked automatically</Badge>
        ) : (
          <Badge tone="brand">Pending</Badge>
        )}
      </div>
      <SubmissionLinks submission={submission} />
      {submission.notes && <p className="mt-1 text-sm text-ink-500">Note: {submission.notes}</p>}

      {!isGraded && (submission.autoGradeNote || submission.autoGradeStuck) && (
        <p className="mt-2 text-sm text-ink-700">
          {submission.autoGradeStuck
            ? "Automatic marking didn't finish, so grade this one yourself or try again."
            : submission.autoGradeNote}
        </p>
      )}
      {running && (
        <p className="mt-2 text-sm text-ink-500">
          The system is checking this against the rubric. It usually takes a minute or two; refresh to see the result.
          You can still grade it yourself.
        </p>
      )}

      {isGraded && submission.criteria && <CriteriaList criteria={submission.criteria} />}

      <div className="mt-3 flex flex-col gap-3">
        {error && <Alert tone="danger" title={error} />}
        {editing ? (
          <>
            <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
              <Field
                id={`score-${submission.id}`}
                label="Score (0–100)"
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
              />
              <div className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor={`feedback-${submission.id}`} className="text-sm font-medium text-ink-700">
                  Feedback
                </label>
                <textarea
                  id={`feedback-${submission.id}`}
                  className="min-h-11 rounded-lg border border-ink-300 px-3 py-2 text-base outline-none sm:text-sm focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
                  rows={isGraded ? 6 : 2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleGrade} disabled={submitting}>
                {submitting ? "Saving…" : isGraded ? "Save new grade" : "Submit grade"}
              </Button>
              {isGraded && (
                <Button variant="secondary" onClick={() => setEditing(false)} disabled={submitting}>
                  Cancel
                </Button>
              )}
              {!isGraded && canRetryAutoGrade && !running && submission.fileName && (
                <Button variant="secondary" onClick={handleRetry} disabled={retrying}>
                  {retrying ? "Starting…" : "Mark automatically again"}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Icon name="pencil" size={16} /> Change grade
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
