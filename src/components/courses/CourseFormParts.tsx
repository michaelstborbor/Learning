"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

// Pieces shared by the new-course form and the course details editor.

export function DurationFields({
  hours,
  minutes,
  onChange,
}: {
  hours: number;
  minutes: number;
  onChange: (hours: number, minutes: number) => void;
}) {
  const inputClass =
    "min-h-11 w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-base tabular-nums text-ink-900 outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100 sm:text-sm";
  const clamp = (value: string, max: number) => Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-ink-700">Duration</legend>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            value={hours}
            onChange={(e) => onChange(clamp(e.target.value, 999), minutes)}
            className={inputClass}
            aria-label="Hours"
          />
          <span className="text-sm text-ink-500">hours</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            step={5}
            value={minutes}
            onChange={(e) => onChange(hours, clamp(e.target.value, 59))}
            className={inputClass}
            aria-label="Minutes"
          />
          <span className="text-sm text-ink-500">minutes</span>
        </label>
      </div>
      <p className="text-xs text-ink-500">Roughly how long a learner needs to finish, including practice.</p>
    </fieldset>
  );
}

/** Lets an author choose a poster image and previews it. The parent
 * receives the chosen file (or null when removed). */
export function PosterPicker({
  currentUrl,
  onChange,
  disabled,
}: {
  currentUrl?: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function choose(file: File | undefined) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onChange(file);
  }

  function remove() {
    setPreview(null);
    onChange(null);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink-700">Course poster</span>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => choose(e.target.files?.[0])}
      />
      {preview ? (
        <div className="group relative overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview or our own API route */}
          <img src={preview} alt="Course poster preview" className="aspect-[16/9] w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-ink-900/70 to-transparent p-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => input.current?.click()}
              className="min-h-10 cursor-pointer rounded-lg bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
            >
              Change
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={remove}
              className="min-h-10 cursor-pointer rounded-lg bg-white/15 px-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/25 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className="flex aspect-[16/7] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/50 text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-raised">
            <Icon name="image" />
          </span>
          <span className="text-sm font-semibold">Add a course poster</span>
          <span className="text-xs text-ink-500">JPG, PNG or WebP. Wide images (16:9) look best.</span>
        </button>
      )}
    </div>
  );
}

export function splitMinutes(total: number) {
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}
