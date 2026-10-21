"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function CompleteLessonButton({
  lessonId,
  alreadyComplete,
}: {
  lessonId: string;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(alreadyComplete);

  async function handleComplete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/complete`, { method: "POST" });
      if (res.ok) {
        setDone(true);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="rise-in inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-50 px-4 text-sm font-semibold text-brand-700" role="status">
        <Icon name="check" size={18} /> Lesson complete
      </p>
    );
  }

  return (
    <Button onClick={handleComplete} disabled={loading}>
      {loading ? "Marking complete…" : "Mark lesson complete"}
    </Button>
  );
}
