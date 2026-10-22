"use client";

import "@fontsource/cormorant-garamond/600.css";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { profileSchema } from "@/lib/profile";

type FieldName = "fullName" | "username" | "phone" | "location" | "bio";

interface Values {
  fullName: string;
  username: string;
  phone: string;
  location: string;
  bio: string;
}

const inputClass =
  "min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-base text-ink-900 outline-none transition-colors focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100 sm:text-sm";

function Row({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-700">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function ProfileForm({
  email,
  initial,
  certificateCount,
}: {
  email: string;
  initial: Values;
  certificateCount: number;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (name: FieldName) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [name]: event.target.value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
    setStatus(null);
  };
  const describedBy = (name: FieldName, hasHint = true) =>
    errors[name] ? `${name}-error` : hasHint ? `${name}-hint` : undefined;

  // Exactly what the certificate will print: the name trimmed at the ends.
  const certificateName = values.fullName.trim();
  const nameChanged = certificateName !== saved.fullName.trim();
  const dirty = (Object.keys(values) as FieldName[]).some((k) => values[k].trim() !== saved[k].trim());

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    const checked = profileSchema.safeParse(values);
    if (!checked.success) {
      const next: Partial<Record<FieldName, string>> = {};
      for (const issue of checked.error.issues) {
        const field = issue.path[0] as FieldName;
        next[field] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.field) setErrors({ [data.field]: data.error });
        else setStatus({ tone: "error", text: data.error ?? "Your profile couldn't be saved. Try again." });
        return;
      }
      const next = { ...values, fullName: data.fullName, username: data.username ?? "" };
      setValues(next);
      setSaved(next);
      setStatus({ tone: "ok", text: "Profile saved." });
      router.refresh();
    } catch {
      setStatus({ tone: "error", text: "Your profile couldn't be saved. Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <Row
        id="fullName"
        label="Full name"
        error={errors.fullName}
        hint="Type it exactly as it should appear on your certificates. We print it word for word, with the same spelling and capital letters."
      >
        <input
          id="fullName"
          className={clsx(inputClass, errors.fullName ? "border-danger-500" : "border-ink-300")}
          value={values.fullName}
          onChange={set("fullName")}
          autoComplete="name"
          maxLength={120}
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={describedBy("fullName")}
          required
        />
      </Row>

      <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-center">
        <p className="text-xs text-ink-500">On your certificates</p>
        <p
          className="mt-1 break-words text-2xl text-brand-900 sm:text-3xl"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}
          aria-live="polite"
        >
          {certificateName || "Your full name"}
        </p>
        {nameChanged && certificateCount > 0 && (
          <p className="mt-1 text-xs text-ink-500">
            Your {certificateCount === 1 ? "certificate" : `${certificateCount} certificates`} will show this name once you save.
          </p>
        )}
      </div>

      <Row
        id="username"
        label="Username (optional)"
        error={errors.username}
        hint="3 to 30 letters, numbers, dots or underscores. Saved in lower case."
      >
        <div className="flex">
          <span className="inline-flex items-center rounded-l-lg border border-r-0 border-ink-300 bg-ink-50 px-3 text-sm text-ink-500">@</span>
          <input
            id="username"
            className={clsx(inputClass, "rounded-l-none", errors.username ? "border-danger-500" : "border-ink-300")}
            value={values.username}
            onChange={set("username")}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={30}
            aria-invalid={Boolean(errors.username)}
            aria-describedby={describedBy("username")}
          />
        </div>
      </Row>

      <Row id="email" label="Email" hint="Used to sign in. Contact us to change it.">
        <input id="email" className={clsx(inputClass, "border-ink-200 bg-ink-50 text-ink-500")} value={email} readOnly aria-describedby="email-hint" />
      </Row>

      <div className="grid gap-5 sm:grid-cols-2">
        <Row id="phone" label="Phone (optional)" error={errors.phone} hint="For example +232 76 123 456.">
          <input
            id="phone"
            type="tel"
            className={clsx(inputClass, errors.phone ? "border-danger-500" : "border-ink-300")}
            value={values.phone}
            onChange={set("phone")}
            autoComplete="tel"
            maxLength={20}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={describedBy("phone")}
          />
        </Row>
        <Row id="location" label="Town or district (optional)" error={errors.location}>
          <input
            id="location"
            className={clsx(inputClass, errors.location ? "border-danger-500" : "border-ink-300")}
            value={values.location}
            onChange={set("location")}
            autoComplete="address-level2"
            maxLength={80}
            aria-invalid={Boolean(errors.location)}
            aria-describedby={describedBy("location", false)}
          />
        </Row>
      </div>

      <Row
        id="bio"
        label="About you (optional)"
        error={errors.bio}
        hint={`${values.bio.trim().length}/300. A line or two about your work or what you're learning.`}
      >
        <textarea
          id="bio"
          rows={3}
          className={clsx(inputClass, "resize-y", errors.bio ? "border-danger-500" : "border-ink-300")}
          value={values.bio}
          onChange={set("bio")}
          maxLength={300}
          aria-invalid={Boolean(errors.bio)}
          aria-describedby={describedBy("bio")}
        />
      </Row>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
        {status && (
          <p role={status.tone === "error" ? "alert" : "status"} className={status.tone === "error" ? "text-sm text-danger-700" : "text-sm text-verified-700"}>
            {status.text}
          </p>
        )}
      </div>
    </form>
  );
}
