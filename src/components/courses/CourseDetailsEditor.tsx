"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { DurationFields, PosterPicker, splitMinutes } from "./CourseFormParts";

interface CourseDetails {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  totalMinutes: number;
  posterUrl: string | null;
}

export function CourseDetailsEditor({ course, posterFailed }: { course: CourseDetails; posterFailed?: boolean }) {
  const router = useRouter();
  const initial = splitMinutes(course.totalMinutes);
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [category, setCategory] = useState(course.category);
  const [level, setLevel] = useState(course.level);
  const [hours, setHours] = useState(initial.hours);
  const [minutes, setMinutes] = useState(initial.minutes);
  // undefined = unchanged, null = removed, File = replaced.
  const [poster, setPoster] = useState<File | null | undefined>(undefined);
  const [status, setStatus] = useState<{ tone: "danger" | "success"; text: string } | null>(
    posterFailed ? { tone: "danger", text: "The course was created, but the poster didn't upload. Try it again here." } : null,
  );
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const durationMinutes = hours * 60 + minutes;
    if (durationMinutes < 5) {
      setStatus({ tone: "danger", text: "Set a duration of at least 5 minutes." });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, level, durationMinutes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Your changes couldn't be saved.");

      if (poster) {
        const { shrinkPoster, uploadPoster } = await import("@/lib/poster-image");
        await uploadPoster(course.id, await shrinkPoster(poster));
      } else if (poster === null && course.posterUrl) {
        await fetch(`/api/courses/${course.id}/poster`, { method: "DELETE" });
      }
      setPoster(undefined);
      setStatus({ tone: "success", text: "Course details saved." });
      router.refresh();
    } catch (error) {
      setStatus({ tone: "danger", text: error instanceof Error ? error.message : "Your changes couldn't be saved." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5 rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
      {status && <Alert tone={status.tone} title={status.text} />}
      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="flex flex-col gap-4">
          <Field id="edit-title" label="Course title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Field
            id="edit-description"
            label="Short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="edit-category" label="Category" value={category} onChange={(e) => setCategory(e.target.value)} required />
            <Field id="edit-level" label="Level" value={level} onChange={(e) => setLevel(e.target.value)} required />
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
        <PosterPicker currentUrl={course.posterUrl} onChange={setPoster} disabled={saving} />
      </div>
      <div>
        <Button type="submit" variant="secondary" disabled={saving}>
          {saving ? "Saving…" : "Save details"}
        </Button>
      </div>
    </form>
  );
}
