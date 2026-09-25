"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

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
      <Button variant="ghost" disabled>
        ✓ Lesson complete
      </Button>
    );
  }

  return (
    <Button onClick={handleComplete} disabled={loading}>
      {loading ? "Marking complete…" : "Mark lesson complete"}
    </Button>
  );
}
