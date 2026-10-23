"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface ExistingProject {
  title: string;
  instructions: string;
  rubric: string;
  weight: number;
  autoGrade: boolean;
}

export function ProjectBuilder({
  courseId,
  existingProject,
  autoGradeAvailable,
}: {
  courseId: string;
  existingProject: ExistingProject | null;
  // False when the server has no ANTHROPIC_API_KEY.
  autoGradeAvailable: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(existingProject?.title ?? "");
  const [instructions, setInstructions] = useState(existingProject?.instructions ?? "");
  const [rubric, setRubric] = useState(existingProject?.rubric ?? "");
  const [skillName, setSkillName] = useState("");
  const [weight, setWeight] = useState(existingProject?.weight ?? 2);
  const [autoGrade, setAutoGrade] = useState(existingProject?.autoGrade ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/project`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          instructions,
          rubric,
          skillName: skillName || undefined,
          weight,
          autoGrade,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-ink-100 bg-white p-4">
      {error && <Alert tone="danger" title={error} />}
      {saved && <Alert tone="success" title="Project saved" />}

      <Field id="projectTitle" label="Project title" value={title} onChange={(e) => setTitle(e.target.value)} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="instructions" className="text-sm font-medium text-ink-700">
          Instructions for the learner
        </label>
        <textarea
          id="instructions"
          className="min-h-24 rounded-lg border border-ink-300 px-3 py-2 text-base outline-none sm:text-sm focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rubric" className="text-sm font-medium text-ink-700">
          Grading rubric (shown to the learner)
        </label>
        <textarea
          id="rubric"
          className="min-h-24 rounded-lg border border-ink-300 px-3 py-2 text-base outline-none sm:text-sm focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
          value={rubric}
          onChange={(e) => setRubric(e.target.value)}
        />
      </div>

      {!existingProject && (
        <Field
          id="skillName"
          label="Skill this proves (optional — adds to the learner's Skills Passport on a pass)"
          value={skillName}
          onChange={(e) => setSkillName(e.target.value)}
        />
      )}

      <div className="max-w-48">
        <Field
          id="projectWeight"
          label="Weight in course grade"
          type="number"
          min={0}
          max={100}
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex min-h-11 items-start gap-3 text-sm font-medium text-ink-700">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-brand-600"
            checked={autoGrade}
            onChange={(e) => setAutoGrade(e.target.checked)}
          />
          <span>
            Grade submissions automatically against the rubric
            <span className="mt-0.5 block font-normal text-ink-500">
              Each uploaded spreadsheet is checked criterion by criterion as soon as it arrives, and the learner gets
              their grade and feedback within a minute or two. Write the rubric as a list of checks, and mark which
              ones are needed to pass. You can change any automatic grade below.
            </span>
          </span>
        </label>
        {autoGrade && !autoGradeAvailable && (
          <p className="text-sm text-highlight-700">
            Automatic grading isn&apos;t set up on this site yet (it needs an ANTHROPIC_API_KEY), so submissions will wait
            for you to grade them.
          </p>
        )}
      </div>

      <Button type="button" className="w-fit" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save project"}
      </Button>
    </div>
  );
}
