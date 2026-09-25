"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function ReviewDecisionPanel({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitDecision(decision: "APPROVE" | "REQUEST_CHANGES") {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, feedback: feedback || undefined }),
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

  if (requestingChanges) {
    return (
      <div className="flex flex-col gap-2">
        {error && <Alert tone="danger" title={error} />}
        <textarea
          className="min-h-20 rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
          placeholder="What needs to change before this can be approved?"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
        <div className="flex gap-2">
          <Button
            variant="danger"
            disabled={submitting || !feedback.trim()}
            onClick={() => submitDecision("REQUEST_CHANGES")}
          >
            {submitting ? "Sending…" : "Send back to instructor"}
          </Button>
          <Button variant="ghost" onClick={() => setRequestingChanges(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <Alert tone="danger" title={error} />}
      <div className="flex gap-2">
        <Button disabled={submitting} onClick={() => submitDecision("APPROVE")}>
          {submitting ? "Approving…" : "Approve"}
        </Button>
        <Button variant="danger" onClick={() => setRequestingChanges(true)}>
          Request changes
        </Button>
      </div>
    </div>
  );
}
