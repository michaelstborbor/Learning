"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function ApplyPanel({
  opportunityId,
  isLoggedIn,
  alreadyApplied,
}: {
  opportunityId: string;
  isLoggedIn: boolean;
  alreadyApplied: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(alreadyApplied);

  if (!isLoggedIn) {
    return <Button onClick={() => router.push("/register")}>Sign up to apply</Button>;
  }

  if (applied) {
    return (
      <Alert tone="success" title="You've applied">
        Track your application status from your dashboard.
      </Alert>
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverNote: coverNote || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setApplied(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Apply</Button>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert tone="danger" title={error} />}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="coverNote" className="text-sm font-medium text-ink-700">
          A note for the organization (optional)
        </label>
        <textarea
          id="coverNote"
          className="min-h-24 rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
          value={coverNote}
          onChange={(e) => setCoverNote(e.target.value)}
        />
      </div>
      <div>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit application"}
        </Button>
      </div>
    </div>
  );
}
