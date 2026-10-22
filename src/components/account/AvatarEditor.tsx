"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { shrinkAvatar } from "@/lib/avatar-image";

export function AvatarEditor({ fullName, initialUrl }: { fullName: string; initialUrl: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function choose(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const blob = await shrinkAvatar(file);
      const res = await fetch("/api/account/avatar", { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Your photo couldn't be saved. Try again.");
      setUrl(data.avatarUrl);
      setMessage({ tone: "ok", text: "Photo updated." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Your photo couldn't be saved. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setUrl(null);
      setMessage({ tone: "ok", text: "Photo removed." });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "Your photo couldn't be removed. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar name={fullName} src={url} size={96} className="ring-4 ring-brand-100" />
      <div className="flex flex-col gap-2">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => choose(e.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => input.current?.click()} disabled={busy}>
            <Icon name="upload" size={18} /> {busy ? "Saving…" : url ? "Change photo" : "Upload photo"}
          </Button>
          {url && (
            <Button type="button" variant="ghost" onClick={remove} disabled={busy}>
              Remove
            </Button>
          )}
        </div>
        <p className="text-sm text-ink-500">JPG, PNG or WebP. We crop it to a square.</p>
        {message && (
          <p role={message.tone === "error" ? "alert" : "status"} className={message.tone === "error" ? "text-sm text-danger-700" : "text-sm text-verified-700"}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
