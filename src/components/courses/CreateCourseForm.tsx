"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { DurationFields, PosterPicker } from "./CourseFormParts";

export function CreateCourseForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [hours, setHours] = useState(4);
  const [minutes, setMinutes] = useState(0);
  const [poster, setPoster] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const durationMinutes = hours * 60 + minutes;
    if (durationMinutes < 5) {
      setError("Set a duration of at least 5 minutes.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, level, durationMinutes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      if (poster) {
        // The course exists by now; a poster failure shouldn't lose it.
        try {
          const { shrinkPoster, uploadPoster } = await import("@/lib/poster-image");
          await uploadPoster(data.id, await shrinkPoster(poster));
        } catch {
          router.push(`/instructor/courses/${data.id}?poster=failed#details`);
          return;
        }
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
    <form
      onSubmit={handleSubmit}
      className="rise-in flex w-full basis-full flex-col gap-5 rounded-2xl border border-ink-100 bg-white p-5 shadow-raised sm:p-6"
    >
      <h2 className="font-display text-lg font-semibold text-ink-900">New course</h2>
      {error && <Alert tone="danger" title={error} />}
      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="flex flex-col gap-4">
          <Field id="title" label="Course title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Field
            id="description"
            label="Short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="category" label="Category" value={category} onChange={(e) => setCategory(e.target.value)} required />
            <Field id="level" label="Level" value={level} onChange={(e) => setLevel(e.target.value)} required />
          </div>
          <DurationFields
            hours={hours}
            minutes={minutes}
            onChange={(h, m) => {
              setHours(h);
              setMinutes(m);
            }}
          />
        </div>
        <PosterPicker onChange={setPoster} disabled={submitting} />
      </div>
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
