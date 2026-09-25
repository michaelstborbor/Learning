"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function ResendVerificationBanner() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleResend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <Alert tone="success" title="Verification email sent">
        Check your inbox for the link.
      </Alert>
    );
  }

  return (
    <Alert tone="info" title="Verify your email">
      {error && <p className="mb-2 text-danger-500">{error}</p>}
      <div className="mt-1">
        <Button variant="ghost" onClick={handleResend} disabled={sending}>
          {sending ? "Sending…" : "Resend verification email"}
        </Button>
      </div>
    </Alert>
  );
}
