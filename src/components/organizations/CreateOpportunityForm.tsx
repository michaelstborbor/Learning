"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const TYPES = ["INTERNSHIP", "JOB", "APPRENTICESHIP", "VOLUNTEER", "PROJECT", "MENTORSHIP"] as const;

export function CreateOpportunityForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("INTERNSHIP");
  const [description, setDescription] = useState("");
  const [eligibilityCriteria, setEligibilityCriteria] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/opportunities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          description,
          eligibilityCriteria,
          location: location || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New opportunity</Button>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border border-ink-100 p-4">
      {error && <Alert tone="danger" title={error} />}
      <Field id="oppTitle" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="oppType" className="text-sm font-medium text-ink-700">
          Type
        </label>
        <select
          id="oppType"
          className="rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="oppDescription" className="text-sm font-medium text-ink-700">
          Description
        </label>
        <textarea
          id="oppDescription"
          className="min-h-24 rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <Field
        id="eligibility"
        label="Who's eligible"
        value={eligibilityCriteria}
        onChange={(e) => setEligibilityCriteria(e.target.value)}
        required
      />
      <Field
        id="oppLocation"
        label="Location (optional)"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Posting…" : "Post opportunity"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
