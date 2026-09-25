"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface CourseOption {
  id: string;
  title: string;
}

export function CreateCohortForm({
  organizationId,
  courses,
}: {
  organizationId: string;
  courses: CourseOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"ONLINE" | "OFFLINE" | "HYBRID">("ONLINE");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/cohorts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title,
          startDate,
          endDate,
          location: location || undefined,
          deliveryMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push(`/organization/cohorts/${data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (courses.length === 0) {
    return (
      <p className="text-sm text-ink-500">
        No published courses are available to run a cohort on yet.
      </p>
    );
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New cohort</Button>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border border-ink-100 p-4">
      {error && <Alert tone="danger" title={error} />}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="courseId" className="text-sm font-medium text-ink-700">
          Course
        </label>
        <select
          id="courseId"
          className="rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>
      <Field id="cohortTitle" label="Cohort title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <div className="grid grid-cols-2 gap-4">
        <Field
          id="startDate"
          label="Start date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
        <Field
          id="endDate"
          label="End date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field
          id="location"
          label="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="deliveryMode" className="text-sm font-medium text-ink-700">
            Delivery mode
          </label>
          <select
            id="deliveryMode"
            className="rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
            value={deliveryMode}
            onChange={(e) => setDeliveryMode(e.target.value as typeof deliveryMode)}
          >
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">In person</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </div>
      </div>
      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create cohort"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
