"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** Issues the certificate (if it isn't already) and opens it. */
export function GetCertificateButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getCertificate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/certificate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push(`/certificates/${data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={getCertificate} disabled={busy} className="w-full">
        <Icon name="award" size={18} /> {busy ? "Preparing your certificate…" : "Get your certificate"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
