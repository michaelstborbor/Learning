"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function AddCohortMemberForm({ cohortId }: { cohortId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInvited(false);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setEmail("");
      if (res.status === 202) {
        // No account existed — an invite email was sent instead of an
        // instant add. See api/cohorts/[cohortId]/members.
        setInvited(true);
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <Field
            id="memberEmail"
            label="Add employee by email"
            type="email"
            placeholder="employee@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <p className="mt-1 text-sm text-danger-500">{error}</p>}
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add"}
        </Button>
      </form>
      {invited && (
        <Alert tone="info" title="Invite sent">
          They don&apos;t have an account yet — an invite email was sent.
          They&apos;ll join this cohort automatically when they register.
        </Alert>
      )}
    </div>
  );
}
