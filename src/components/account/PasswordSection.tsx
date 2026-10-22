"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";

export function PasswordSection({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setResult(null);
    const next: Record<string, string> = {};
    if (!currentPassword) next.currentPassword = "Enter your current password.";
    if (newPassword.length < 8) next.newPassword = "Your new password must be at least 8 characters.";
    if (confirm !== newPassword) next.confirm = "The two new passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.field) setErrors({ [data.field]: data.error });
        else setResult({ tone: "danger", text: data.error ?? "Your password couldn't be changed. Try again." });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setResult({ tone: "success", text: "Password changed. You've been signed out on your other devices." });
    } catch {
      setResult({ tone: "danger", text: "Your password couldn't be changed. Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  }

  async function emailResetLink() {
    setResult(null);
    setSending(true);
    try {
      const res = await fetch("/api/account/password-reset-email", { method: "POST" });
      const data = await res.json();
      setResult(
        res.ok
          ? { tone: "success", text: `A reset link is on its way to ${email}. It works for one hour.` }
          : { tone: "danger", text: data.error ?? "The reset link couldn't be sent. Try again." },
      );
    } catch {
      setResult({ tone: "danger", text: "The reset link couldn't be sent. Check your connection and try again." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {result && <Alert tone={result.tone} title={result.text} />}
      <form onSubmit={changePassword} noValidate className="flex flex-col gap-4">
        <Field
          id="currentPassword"
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          error={errors.currentPassword}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="newPassword"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.newPassword}
          />
          <Field
            id="confirm"
            label="Repeat new password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={saving} className="self-start">
          <Icon name="key" size={18} /> {saving ? "Resetting…" : "Reset password"}
        </Button>
      </form>
      <div className="border-t border-ink-100 pt-4">
        <p className="text-sm text-ink-500">Don&apos;t know your current password? We can email you a link to set a new one.</p>
        <Button type="button" variant="ghost" onClick={emailResetLink} disabled={sending} className="mt-2 -ml-2">
          {sending ? "Sending…" : "Email me a reset link"}
        </Button>
      </div>
    </div>
  );
}
