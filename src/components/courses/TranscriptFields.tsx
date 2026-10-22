"use client";

import { useId, useRef, useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Alert } from "@/components/ui/Alert";
import {
  MAX_TRANSCRIPT_CHARS,
  TRANSCRIPT_LANGUAGES,
  cleanTranscript,
  type TranscriptLanguage,
} from "@/lib/transcript";

// Transcript input for a video or audio file: a language switch (English
// or Krio), a text box, and an import for .txt / .vtt / .srt caption files.
export function TranscriptFields({
  text,
  language,
  onChange,
  disabled,
}: {
  text: string;
  language: TranscriptLanguage;
  onChange: (text: string, language: TranscriptLanguage) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  async function importFile(file: File | undefined) {
    if (!file) return;
    onChange(cleanTranscript(await file.text()).slice(0, MAX_TRANSCRIPT_CHARS), language);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={`${id}-text`} className="text-sm font-medium text-ink-700">
          Transcript
        </label>
        <div role="radiogroup" aria-label="Transcript language" className="flex rounded-lg bg-ink-100 p-0.5">
          {(Object.keys(TRANSCRIPT_LANGUAGES) as TranscriptLanguage[]).map((code) => (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={language === code}
              disabled={disabled}
              onClick={() => onChange(text, code)}
              className={clsx(
                "min-h-9 cursor-pointer rounded-md px-3 text-sm font-medium transition-colors",
                language === code ? "bg-white text-brand-700 shadow-raised" : "text-ink-600 hover:text-ink-900",
              )}
            >
              {TRANSCRIPT_LANGUAGES[code]}
            </button>
          ))}
        </div>
      </div>
      <textarea
        id={`${id}-text`}
        value={text}
        disabled={disabled}
        maxLength={MAX_TRANSCRIPT_CHARS}
        onChange={(e) => onChange(e.target.value, language)}
        rows={6}
        placeholder={`Type or paste what is said in the recording, in ${TRANSCRIPT_LANGUAGES[language]}…`}
        aria-describedby={`${id}-help`}
        className="min-h-32 rounded-lg border border-ink-300 bg-white px-3 py-2 text-base leading-relaxed outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100 sm:text-sm"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`${id}-help`} className="text-xs text-ink-500">
          The AI study buddy reads this to explain the lesson. Learners can read it too.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept=".txt,.vtt,.srt,text/plain,text/vtt"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => importFile(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInput.current?.click()}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        >
          <Icon name="upload" size={16} /> Import .txt, .vtt or .srt
        </button>
      </div>
    </div>
  );
}

/** Transcript editor for a file that is already uploaded. */
export function TranscriptEditor({
  mediaId,
  initialText,
  initialLanguage,
  onSaved,
  onCancel,
}: {
  mediaId: string;
  initialText: string;
  initialLanguage: TranscriptLanguage;
  onSaved: (text: string | null, language: TranscriptLanguage | null) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [language, setLanguage] = useState(initialLanguage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/media/${mediaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, transcriptLanguage: language }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "The transcript couldn't be saved.");
      onSaved(data.transcript, data.transcriptLanguage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The transcript couldn't be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-ink-50 p-3">
      {error && <Alert tone="danger" title={error} />}
      <TranscriptFields
        text={text}
        language={language}
        disabled={saving}
        onChange={(t, l) => {
          setText(t);
          setLanguage(l);
        }}
      />
      <div className="flex gap-2">
        <Button variant="secondary" className="min-h-10" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save transcript"}
        </Button>
        <Button variant="ghost" className="min-h-10" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
