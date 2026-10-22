"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

// Sits at the end of each module: marks every lesson in it as done in one
// step. Shows a "Module complete" status once all its lessons are done.
export function CompleteModuleButton({
  moduleId,
  alreadyComplete,
}: {
  moduleId: string;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/modules/${moduleId}/complete`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "This module couldn't be marked complete. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("You seem to be offline. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (alreadyComplete) {
    return (
      <p className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-50 px-4 text-sm font-semibold text-brand-700" role="status">
        <Icon name="check" size={18} /> Module complete
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" onClick={handleComplete} disabled={loading}>
        <Icon name="check" size={18} /> {loading ? "Marking complete…" : "Mark module complete"}
      </Button>
      {error && (
        <p className="text-sm text-danger-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
