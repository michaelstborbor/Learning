// Transcripts for course video and audio, written in English or Krio.
// The AI study buddy reads them (see src/lib/tutor.ts) and learners can
// read them under the player.

export const TRANSCRIPT_LANGUAGES = {
  en: "English",
  kri: "Krio",
} as const;

export type TranscriptLanguage = keyof typeof TRANSCRIPT_LANGUAGES;

export const MAX_TRANSCRIPT_CHARS = 100_000;

export function isTranscriptLanguage(value: unknown): value is TranscriptLanguage {
  return typeof value === "string" && value in TRANSCRIPT_LANGUAGES;
}

const TIMING = /^\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3}\s+-->\s+\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3}.*$/;

/** Turns a caption file (WebVTT or SRT) or pasted text into plain
 * paragraphs: drops the header, cue numbers, timings and markup tags, and
 * joins the lines of each cue. Plain text passes through tidied. */
export function cleanTranscript(raw: string): string {
  const lines = raw.replace(/\r\n?/g, "\n").replace(/^﻿/, "").split("\n");
  const isCaptionFile = lines.some((line) => TIMING.test(line.trim()));
  if (!isCaptionFile) {
    return raw.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  const cues: string[] = [];
  let current: string[] = [];
  let skippingBlock = false;
  const flush = () => {
    if (current.length) cues.push(current.join(" "));
    current = [];
  };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      skippingBlock = false;
      continue;
    }
    if (/^WEBVTT\b/.test(line) || /^(NOTE|STYLE|REGION)\b/.test(line)) {
      skippingBlock = true;
      continue;
    }
    if (skippingBlock || TIMING.test(line) || /^\d+$/.test(line)) continue;
    const text = line.replace(/<[^>]+>/g, "").replace(/\{\\[^}]*\}/g, "").trim();
    if (text) current.push(text);
  }
  flush();

  // Captions often repeat a line across neighbouring cues.
  const deduped = cues.filter((cue, i) => cue !== cues[i - 1]);
  return deduped.join("\n").trim();
}
