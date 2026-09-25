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
}

export function ProjectBuilder({
  courseId,
  existingProject,
}: {
  courseId: string;
  existingProject: ExistingProject | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(existingProject?.title ?? "");
  const [instructions, setInstructions] = useState(existingProject?.instructions ?? "");
  const [rubric, setRubric] = useState(existingProject?.rubric ?? "");
  const [skillName, setSkillName] = useState("");
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
    <div className="flex flex-col gap-4 rounded-md border border-ink-100 p-4">
      {error && <Alert tone="danger" title={error} />}
      {saved && <Alert tone="success" title="Project saved" />}

      <Field id="projectTitle" label="Project title" value={title} onChange={(e) => setTitle(e.target.value)} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="instructions" className="text-sm font-medium text-ink-700">
          Instructions for the learner
        </label>
        <textarea
          id="instructions"
          className="min-h-24 rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
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
          className="min-h-24 rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
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

      <Button type="button" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save project"}
      </Button>
    </div>
  );
}
