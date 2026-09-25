"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface Member {
  learnerId: string;
  fullName: string;
}

export function AttendanceForm({
  cohortId,
  members,
}: {
  cohortId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [present, setPresent] = useState<Record<string, boolean>>(
    Object.fromEntries(members.map((m) => [m.learnerId, true])),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionDate, records: present }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (members.length === 0) {
    return <p className="text-sm text-ink-500">Add learners to the cohort to take attendance.</p>;
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-ink-100 p-4">
      {error && <Alert tone="danger" title={error} />}
      {saved && <Alert tone="success" title="Attendance saved" />}
      <div className="max-w-xs">
        <Field
          id="sessionDate"
          label="Session date"
          type="date"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
        />
      </div>
      <ul className="flex flex-col gap-2">
        {members.map((member) => (
          <li key={member.learnerId} className="flex items-center justify-between text-sm">
            <span className="text-ink-700">{member.fullName}</span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={present[member.learnerId] ?? true}
                onChange={(e) =>
                  setPresent((prev) => ({ ...prev, [member.learnerId]: e.target.checked }))
                }
              />
              Present
            </label>
          </li>
        ))}
      </ul>
      <div>
        <Button onClick={handleSave} disabled={submitting}>
          {submitting ? "Saving…" : "Save attendance"}
        </Button>
      </div>
    </div>
  );
}
