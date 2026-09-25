"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";

interface Submission {
  id: string;
  submissionUrl: string;
  status: "PENDING" | "GRADED";
  score: number | null;
  feedback: string | null;
  submittedAt: string;
}

export function ProjectSubmissionPanel({
  projectId,
  submissions,
}: {
  projectId: string;
  submissions: Submission[];
}) {
  const router = useRouter();
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasPassed = submissions.some((s) => s.status === "GRADED" && (s.score ?? 0) >= 70);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionUrl, notes: notes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmissionUrl("");
      setNotes("");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {submissions.length > 0 && (
        <div>
          <p className="font-medium text-ink-900">Your submissions</p>
          <ul className="mt-2 flex flex-col gap-2">
            {submissions.map((s) => (
              <li key={s.id} className="rounded-md border border-ink-100 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <a
                    href={s.submissionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 hover:underline"
                  >
                    View submission
                  </a>
                  {s.status === "PENDING" ? (
                    <Badge tone="brand">Awaiting grading</Badge>
                  ) : (s.score ?? 0) >= 70 ? (
                    <Badge tone="verified">Passed — {s.score}%</Badge>
                  ) : (
                    <Badge tone="danger">Not yet — {s.score}%</Badge>
                  )}
                </div>
                {s.feedback && (
                  <p className="mt-2 text-ink-500">Feedback: {s.feedback}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasPassed ? (
        <Alert tone="success" title="Competency demonstrated">
          Your submission passed. This skill is now on your Skills Passport.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="font-medium text-ink-900">Submit your work</p>
          {error && <Alert tone="danger" title={error} />}
          <Field
            id="submissionUrl"
            label="Link to your work"
            type="url"
            placeholder="https://…"
            value={submissionUrl}
            onChange={(e) => setSubmissionUrl(e.target.value)}
            required
          />
          <Field
            id="notes"
            label="Notes for your reviewer (optional)"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit for grading"}
          </Button>
        </form>
      )}
    </div>
  );
}
