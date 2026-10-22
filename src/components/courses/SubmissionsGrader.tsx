"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { safeHref } from "@/lib/validation";

interface PendingSubmission {
  id: string;
  learnerName: string;
  submissionUrl: string | null;
  fileName: string | null;
  notes: string | null;
  submittedAt: string;
}

export function SubmissionsGrader({ submissions }: { submissions: PendingSubmission[] }) {
  if (submissions.length === 0) {
    return <p className="text-sm text-ink-500">No submissions waiting to be graded.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {submissions.map((submission) => (
        <GradeCard key={submission.id} submission={submission} />
      ))}
    </div>
  );
}

function GradeCard({ submission }: { submission: PendingSubmission }) {
  const router = useRouter();
  const [score, setScore] = useState(70);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="rounded-md border border-ink-100 p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-ink-900">{submission.learnerName}</p>
        <Badge tone="brand">Pending</Badge>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {submission.fileName && (
          <a
            href={`/api/submissions/${submission.id}/file`}
            className="inline-flex items-center gap-1.5 text-brand-600 hover:underline"
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
            className="text-brand-600 hover:underline"
          >
            View link
          </a>
        )}
      </div>
      {submission.notes && (
        <p className="mt-1 text-sm text-ink-500">Note: {submission.notes}</p>
      )}

      <div className="mt-3 flex flex-col gap-3">
        {error && <Alert tone="danger" title={error} />}
        <div className="grid grid-cols-[120px_1fr] gap-3">
          <Field
            id={`score-${submission.id}`}
            label="Score (0–100)"
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
          />
          <Field
            id={`feedback-${submission.id}`}
            label="Feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>
        <div>
          <Button onClick={handleGrade} disabled={submitting}>
            {submitting ? "Saving…" : "Submit grade"}
          </Button>
        </div>
      </div>
    </div>
  );
}
