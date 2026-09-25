"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function CreateCourseForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [estimatedHours, setEstimatedHours] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, level, estimatedHours }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push(`/instructor/courses/${data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New course</Button>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border border-ink-100 p-4">
      {error && <Alert tone="danger" title={error} />}
      <Field id="title" label="Course title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Field
        id="description"
        label="Short description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Field id="category" label="Category" value={category} onChange={(e) => setCategory(e.target.value)} required />
        <Field id="level" label="Level" value={level} onChange={(e) => setLevel(e.target.value)} required />
      </div>
      <Field
        id="estimatedHours"
        label="Estimated hours"
        type="number"
        min={1}
        value={estimatedHours}
        onChange={(e) => setEstimatedHours(Number(e.target.value))}
        required
      />
      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create draft course"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
