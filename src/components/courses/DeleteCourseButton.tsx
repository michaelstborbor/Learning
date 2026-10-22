"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";

// "Remove course": opens a confirmation dialog where the course title must
// be typed back before anything is deleted. The server re-checks every rule
// (see DELETE in api/courses/[courseId]/route.ts); blockedReason only
// explains up front why the server would refuse.
export function DeleteCourseButton({
  courseId,
  courseTitle,
  enrolmentCount,
  blockedReason,
}: {
  courseId: string;
  courseTitle: string;
  enrolmentCount: number;
  blockedReason: string | null;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open() {
    setTyped("");
    setError(null);
    dialogRef.current?.showModal();
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmTitle: typed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "The course couldn't be removed. Please try again.");
        return;
      }
      dialogRef.current?.close();
      router.push("/instructor/courses");
      router.refresh();
    } catch {
      setError("You seem to be offline. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const matches = typed.trim() === courseTitle.trim();

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-white/15 px-4 text-sm font-semibold text-white ring-1 ring-white/40 hover:bg-danger-500 hover:ring-danger-500"
      >
        <Icon name="trash" size={18} /> Remove course
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-course-title"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 text-ink-900 shadow-overlay backdrop:bg-ink-900/50"
      >
        <div className="flex flex-col gap-4 p-6">
          <h2 id="delete-course-title" className="font-display text-xl font-bold">
            Remove this course?
          </h2>

          {blockedReason ? (
            <>
              <Alert tone="info" title={blockedReason} />
              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => dialogRef.current?.close()}>
                  Close
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-700">
                This permanently deletes <strong>{courseTitle}</strong> with all its modules, lessons,
                quizzes, project, uploaded files and poster
                {enrolmentCount > 0
                  ? `, and removes ${enrolmentCount} enrolled learner${enrolmentCount === 1 ? "" : "s"} along with their progress`
                  : ""}
                . It can&apos;t be undone.
              </p>
              <Field
                id="confirm-course-title"
                label="Type the course title to confirm"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
              />
              {error && <Alert tone="danger" title={error} />}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => dialogRef.current?.close()} disabled={loading}>
                  Keep course
                </Button>
                <Button variant="danger" onClick={handleDelete} disabled={!matches || loading}>
                  {loading ? "Removing…" : "Remove course"}
                </Button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
