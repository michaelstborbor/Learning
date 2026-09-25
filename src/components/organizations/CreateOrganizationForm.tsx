"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function CreateOrganizationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, website: website || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border border-ink-100 p-4">
      <div>
        <h1 className="font-display text-xl font-bold text-ink-900">
          Set up your organization
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Once created, you can run cohorts for your employees and post
          opportunities.
        </p>
      </div>
      {error && <Alert tone="danger" title={error} />}
      <Field id="orgName" label="Organization name" value={name} onChange={(e) => setName(e.target.value)} required />
      <Field
        id="orgDescription"
        label="Short description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <Field
        id="orgWebsite"
        label="Website (optional)"
        type="url"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />
      <div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create organization profile"}
        </Button>
      </div>
    </form>
  );
}
