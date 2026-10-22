"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

// everywhere: also signs out every other phone or computer this account is
// logged in on (useful after using a shared or lost device).
export function LogoutButton({ everywhere = false }: { everywhere?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ everywhere }),
    });
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant="ghost" onClick={handleLogout} disabled={loading}>
      {loading ? "Logging out…" : everywhere ? "Log out on all devices" : "Log out"}
    </Button>
  );
}
