"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";

export function AddModuleForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setTitle("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <Alert tone="danger" title={error} />}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field id="moduleTitle" label="New module title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add module"}
        </Button>
      </div>
    </form>
  );
}

export function AddLessonForm({ moduleId }: { moduleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setTitle("");
      setContent("");
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left text-sm text-brand-600 hover:underline"
      >
        + Add lesson
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-md border border-ink-100 p-3">
      {error && <Alert tone="danger" title={error} />}
      <Field id={`lessonTitle-${moduleId}`} label="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`lessonContent-${moduleId}`} className="text-sm font-medium text-ink-700">
          Lesson content
        </label>
        <textarea
          id={`lessonContent-${moduleId}`}
          className="min-h-32 rounded-md border border-ink-300 px-3 py-2 text-sm text-ink-900 outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save lesson"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Shared by the rename and edit forms below: sends a PATCH and reports the
// API's own error message, so the editor sees exactly what to fix.
async function patchJson(url: string, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.error ?? "Your changes couldn't be saved.";
  } catch {
    return "Your changes couldn't be saved. Check your connection and try again.";
  }
}

export function ModuleTitleEditor({ moduleId, number, title }: { moduleId: string; number: number; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const message = await patchJson(`/api/modules/${moduleId}`, { title: value });
    setSubmitting(false);
    if (message) {
      setError(message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display font-semibold text-ink-900">
          Module {number}: {title}
        </p>
        <button
          type="button"
          onClick={() => {
            setValue(title);
            setError(null);
            setOpen(true);
          }}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
        >
          <Icon name="pencil" size={16} /> Rename<span className="sr-only"> module {number}</span>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <Alert tone="danger" title={error} />}
      <Field
        id={`moduleTitle-${moduleId}`}
        label={`Module ${number} title`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
      />
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" disabled={submitting}>
          {submitting ? "Saving…" : "Save title"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function LessonEditor({
  lessonId,
  number,
  title,
  content,
  mediaCount,
}: {
  lessonId: string;
  number: string;
  title: string;
  content: string;
  mediaCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const [contentValue, setContentValue] = useState(content);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const message = await patchJson(`/api/lessons/${lessonId}`, { title: titleValue, content: contentValue });
    setSubmitting(false);
    if (message) {
      setError(message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-2 py-1">
        <span className="min-w-0 break-words">
          <span className="tabular-nums text-ink-400">{number}</span> {title}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {mediaCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-brand-600">
              <Icon name="video" size={14} /> {mediaCount} media
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setTitleValue(title);
              setContentValue(content);
              setError(null);
              setOpen(true);
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
          >
            <Icon name="pencil" size={16} /> Edit<span className="sr-only"> lesson {number}</span>
          </button>
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="my-2 flex flex-col gap-3 rounded-md border border-ink-100 p-3">
      {error && <Alert tone="danger" title={error} />}
      <Field
        id={`editLessonTitle-${lessonId}`}
        label={`Lesson ${number} title`}
        value={titleValue}
        onChange={(e) => setTitleValue(e.target.value)}
        required
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`editLessonContent-${lessonId}`} className="text-sm font-medium text-ink-700">
          Lesson text
        </label>
        <textarea
          id={`editLessonContent-${lessonId}`}
          className="min-h-64 rounded-md border border-ink-300 px-3 py-2 text-base text-ink-900 outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100 sm:text-sm"
          value={contentValue}
          onChange={(e) => setContentValue(e.target.value)}
          required
        />
        <p className="text-xs text-ink-500">Line breaks show exactly as you type them. Video, audio and documents are added in Media.</p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" disabled={submitting}>
          {submitting ? "Saving…" : "Save lesson"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
