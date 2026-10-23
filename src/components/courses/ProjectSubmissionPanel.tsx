"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { safeHref } from "@/lib/validation";
import {
  MAX_SUBMISSION_FILE_BYTES,
  SUBMISSION_FILE_ACCEPT,
  WRONG_FILE_TYPE_MESSAGE,
  submissionFileExtension,
} from "@/lib/submission-files";

interface Submission {
  id: string;
  submissionUrl: string | null;
  fileName: string | null;
  status: "PENDING" | "GRADED";
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  // The system is checking it against the rubric right now.
  beingMarked: boolean;
  gradedAutomatically: boolean;
}

// While a submission is being marked automatically, look again every so
// often so the grade appears without a reload. Stops after a few minutes.
const MARKING_POLL_MS = 8000;
const MARKING_POLL_LIMIT = 40;

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
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasPassed = submissions.some((s) => s.status === "GRADED" && (s.score ?? 0) >= 70);
  const beingMarked = submissions.some((s) => s.beingMarked);

  useEffect(() => {
    if (!beingMarked) return;
    let polls = 0;
    const timer = setInterval(() => {
      polls += 1;
      if (polls > MARKING_POLL_LIMIT) clearInterval(timer);
      else router.refresh();
    }, MARKING_POLL_MS);
    return () => clearInterval(timer);
  }, [beingMarked, router]);

  function chooseFile(chosen: File | undefined) {
    if (fileInput.current) fileInput.current.value = "";
    if (!chosen) return;
    if (!submissionFileExtension(chosen.name)) {
      setError(WRONG_FILE_TYPE_MESSAGE);
      return;
    }
    if (chosen.size > MAX_SUBMISSION_FILE_BYTES) {
      setError("Your file must be smaller than 4 MB.");
      return;
    }
    setError(null);
    setFile(chosen);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file && !submissionUrl.trim()) {
      setError("Upload your project file or add a link to your work.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      if (file) form.append("file", file);
      if (submissionUrl.trim()) form.append("submissionUrl", submissionUrl.trim());
      if (notes.trim()) form.append("notes", notes);
      const res = await fetch(`/api/projects/${projectId}/submit`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmissionUrl("");
      setNotes("");
      setFile(null);
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {s.fileName && (
                      <a
                        href={`/api/submissions/${s.id}/file`}
                        className="inline-flex items-center gap-1.5 text-brand-600 hover:underline"
                      >
                        <Icon name="download" size={16} />
                        <span className="break-all">{s.fileName}</span>
                      </a>
                    )}
                    {safeHref(s.submissionUrl) && (
                      <a
                        href={safeHref(s.submissionUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline"
                      >
                        View link
                      </a>
                    )}
                  </div>
                  {s.beingMarked ? (
                    <Badge tone="brand">Being marked…</Badge>
                  ) : s.status === "PENDING" ? (
                    <Badge tone="brand">Awaiting grading</Badge>
                  ) : (s.score ?? 0) >= 70 ? (
                    <Badge tone="verified">Passed — {s.score}%</Badge>
                  ) : (
                    <Badge tone="danger">Not yet — {s.score}%</Badge>
                  )}
                </div>
                {s.beingMarked && (
                  <p className="mt-2 text-ink-500" role="status">
                    Your work is being checked against the rubric. Your grade and feedback usually appear here within a
                    minute or two.
                  </p>
                )}
                {s.feedback && (
                  <p className="mt-2 whitespace-pre-line break-words text-ink-500">Feedback: {s.feedback}</p>
                )}
                {s.status === "GRADED" && s.gradedAutomatically && (
                  <p className="mt-2 text-xs text-ink-500">
                    Marked automatically against the rubric. Your instructor can review it and change the grade.
                  </p>
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
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-brand-400 bg-brand-50/50 p-4">
            <input
              ref={fileInput}
              id="projectFile"
              type="file"
              accept={SUBMISSION_FILE_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => chooseFile(e.target.files?.[0])}
            />
            {file ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-2 text-sm text-ink-900">
                  <Icon name="document" size={18} className="shrink-0 text-brand-600" />
                  <span className="break-all font-medium">{file.name}</span>
                  <span className="shrink-0 text-ink-500">{formatSize(file.size)}</span>
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => fileInput.current?.click()} disabled={submitting}>
                    Change file
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setFile(null)} disabled={submitting}>
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="self-start"
                onClick={() => fileInput.current?.click()}
                disabled={submitting}
                aria-describedby="projectFile-help"
              >
                <Icon name="upload" size={18} /> Upload your project
              </Button>
            )}
            <p id="projectFile-help" className="text-sm text-ink-500">
              Excel (.xlsx, .xls) or CSV (.csv) files only, up to 4 MB.
            </p>
          </div>
          <Field
            id="submissionUrl"
            label="Or add a link to your work (optional)"
            type="url"
            placeholder="https://…"
            value={submissionUrl}
            onChange={(e) => setSubmissionUrl(e.target.value)}
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
