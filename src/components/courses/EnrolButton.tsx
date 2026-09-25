"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function EnrolButton({
  courseId,
  isLoggedIn,
  alreadyEnrolled,
}: {
  courseId: string;
  isLoggedIn: boolean;
  alreadyEnrolled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoggedIn) {
    return (
      <Button onClick={() => router.push("/register")}>
        Sign up to enrol
      </Button>
    );
  }

  if (alreadyEnrolled) {
    return (
      <Button onClick={() => router.push(`/learn/${courseId}`)}>
        Continue learning
      </Button>
    );
  }

  async function handleEnrol() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/enrol`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push(`/learn/${courseId}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <Alert tone="danger" title={error} />}
      <Button onClick={handleEnrol} disabled={loading}>
        {loading ? "Enrolling…" : "Enrol — it's free"}
      </Button>
    </div>
  );
}
