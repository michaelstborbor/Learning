"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

type CourseStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

// Matches the server-side state machine in api/courses/[courseId]/publish —
// this button is only ever active for the two real transitions (Approved ->
// Published, Published -> Archived). Any other status shows an
// explanatory, disabled state rather than a button that would just fail.
export function PublishToggle({ courseId, status }: { courseId: string; status: CourseStatus }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (status === "APPROVED") {
    return (
      <div className="flex flex-col items-end gap-1">
        {error && <Alert tone="danger" title={error} />}
        <Button onClick={handleClick} disabled={loading}>
          {loading ? "Publishing…" : "Publish course"}
        </Button>
      </div>
    );
  }

  if (status === "PUBLISHED") {
    return (
      <div className="flex flex-col items-end gap-1">
        {error && <Alert tone="danger" title={error} />}
        <Button variant="ghost" onClick={handleClick} disabled={loading}>
          {loading ? "Archiving…" : "Archive course"}
        </Button>
      </div>
    );
  }

  return (
    <p className="text-xs text-ink-500">
      {status === "ARCHIVED" ? "Archived" : "Waiting on the review workflow"}
    </p>
  );
}
