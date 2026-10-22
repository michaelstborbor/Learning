"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Icon, type IconName } from "@/components/ui/Icon";
import { TRANSCRIPT_LANGUAGES, isTranscriptLanguage, type TranscriptLanguage } from "@/lib/transcript";
import { TranscriptEditor, TranscriptFields } from "./TranscriptFields";

type Kind = "VIDEO" | "AUDIO" | "DOCUMENT";

export interface ManagedMedia {
  id: string;
  kind: Kind;
  title: string;
  fileName: string;
  sizeBytes: number;
  originalSizeBytes: number;
  durationSeconds: number | null;
  lessonId: string | null;
  transcript: string | null;
  transcriptLanguage: string | null;
}

interface LessonOption {
  id: string;
  label: string;
}

const KINDS: { kind: Kind; label: string; icon: IconName; accept: string; hint: string }[] = [
  {
    kind: "VIDEO",
    label: "Add video",
    icon: "video",
    accept: "video/*",
    hint: "Compressed to 720p MP4 on your device",
  },
  {
    kind: "AUDIO",
    label: "Add audio",
    icon: "audio",
    accept: "audio/*",
    hint: "Compressed to a small M4A for slow connections",
  },
  {
    kind: "DOCUMENT",
    label: "Add document",
    icon: "document",
    accept: ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods,.txt,.md,.csv,.rtf,.epub,.zip",
    hint: "PDF, Office, text and more. Text files are zipped",
  },
];

type Stage =
  | { name: "idle" }
  | { name: "compressing"; progress: number }
  | { name: "uploading"; progress: number }
  | { name: "unsupported"; reason: string }
  | { name: "done"; saved: string | null }
  | { name: "error"; message: string };

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function titleFromFileName(name: string): string {
  const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
  const words = base.replace(/[_-]+/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : "Untitled";
}

function putWithProgress(
  url: string,
  headers: Record<string, string>,
  body: Blob,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("The upload was rejected. Please try again."));
    xhr.onerror = () => reject(new Error("The connection dropped during upload. Please try again."));
    xhr.send(body);
  });
}

export function MediaManager({
  courseId,
  lessons,
  media,
}: {
  courseId: string;
  lessons: LessonOption[];
  media: ManagedMedia[];
}) {
  const router = useRouter();
  const inputs = useRef<Record<Kind, HTMLInputElement | null>>({ VIDEO: null, AUDIO: null, DOCUMENT: null });
  const [kind, setKind] = useState<Kind | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [stage, setStage] = useState<Stage>({ name: "idle" });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [transcriptLanguage, setTranscriptLanguage] = useState<TranscriptLanguage>("en");
  const [editingTranscript, setEditingTranscript] = useState<string | null>(null);

  const busy = stage.name === "compressing" || stage.name === "uploading";

  function pick(nextKind: Kind) {
    if (busy) return;
    inputs.current[nextKind]?.click();
  }

  function onChosen(nextKind: Kind, chosen: File | undefined) {
    if (!chosen) return;
    setKind(nextKind);
    setFile(chosen);
    setTitle(titleFromFileName(chosen.name));
    setStage({ name: "idle" });
  }

  function reset() {
    setKind(null);
    setFile(null);
    setTitle("");
    setTranscript("");
    setStage({ name: "idle" });
    Object.values(inputs.current).forEach((input) => {
      if (input) input.value = "";
    });
  }

  async function upload(skipCompression: boolean) {
    if (!file || !kind) return;
    try {
      const compressor = await import("@/lib/media-compress");
      let prepared: import("@/lib/media-compress").CompressedFile;

      if (skipCompression) {
        prepared = {
          blob: file,
          mimeType: kind === "DOCUMENT" ? compressor.documentMimeType(file) : file.type,
          fileName: file.name,
          contentEncoding: null,
          durationSeconds: kind === "DOCUMENT" ? null : await compressor.readDuration(file),
          originalSize: file.size,
          compressed: false,
        };
      } else {
        setStage({ name: "compressing", progress: 0 });
        try {
          prepared = await compressor.compressForUpload(file, kind, (progress) =>
            setStage({ name: "compressing", progress }),
          );
        } catch (error) {
          if (error instanceof compressor.CompressionUnsupportedError) {
            setStage({ name: "unsupported", reason: error.message });
            return;
          }
          throw error;
        }
      }

      setStage({ name: "uploading", progress: 0 });
      const res = await fetch(`/api/courses/${courseId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title,
          lessonId: lessonId || null,
          fileName: prepared.fileName,
          mimeType: prepared.mimeType,
          contentEncoding: prepared.contentEncoding,
          sizeBytes: prepared.blob.size,
          originalSizeBytes: prepared.originalSize,
          durationSeconds: prepared.durationSeconds,
          transcript: kind === "DOCUMENT" ? null : transcript,
          transcriptLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't start the upload.");

      const onProgress = (progress: number) => setStage({ name: "uploading", progress });
      if (data.upload.method === "BLOB") {
        const { upload: uploadToBlob } = await import("@vercel/blob/client");
        await uploadToBlob(data.upload.pathname, prepared.blob, {
          access: "private",
          handleUploadUrl: data.upload.handleUploadUrl,
          contentType: data.upload.contentType,
          multipart: prepared.blob.size > 8 * 1024 * 1024,
          onUploadProgress: ({ loaded, total }) => onProgress(total ? loaded / total : 0),
        });
      } else {
        await putWithProgress(data.upload.url, data.upload.headers, prepared.blob, onProgress);
      }

      const done = await fetch(`/api/media/${data.id}/complete`, { method: "POST" });
      const doneData = await done.json();
      if (!done.ok) throw new Error(doneData.error ?? "The upload couldn't be confirmed.");

      const saved =
        prepared.compressed && prepared.originalSize > prepared.blob.size
          ? `${formatBytes(prepared.originalSize)} → ${formatBytes(prepared.blob.size)} (${Math.round(
              (1 - prepared.blob.size / prepared.originalSize) * 100,
            )}% smaller)`
          : null;
      setStage({ name: "done", saved });
      setFile(null);
      setTranscript("");
      router.refresh();
    } catch (error) {
      setStage({
        name: "error",
        message: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  const lessonLabel = (id: string | null) =>
    id ? lessons.find((l) => l.id === id)?.label ?? "A lesson" : "Whole course";

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {KINDS.map((item) => (
          <div key={item.kind}>
            <input
              ref={(el) => {
                inputs.current[item.kind] = el;
              }}
              type="file"
              accept={item.accept}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => onChosen(item.kind, e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => pick(item.kind)}
              disabled={busy}
              className={clsx(
                "flex h-full w-full cursor-pointer flex-col items-start gap-2 rounded-xl border-2 border-dashed p-4 text-left transition-colors",
                "border-brand-200 bg-brand-50/50 hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50",
                kind === item.kind && file && "border-brand-500 bg-brand-50",
              )}
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-brand-600 shadow-raised">
                <Icon name={item.icon} />
              </span>
              <span className="font-semibold text-ink-900">{item.label}</span>
              <span className="text-xs text-ink-500">{item.hint}</span>
            </button>
          </div>
        ))}
      </div>

      {file && kind && (
        <div className="rise-in flex flex-col gap-4 rounded-xl border border-ink-100 bg-white p-4 shadow-raised">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink-900">{file.name}</p>
              <p className="text-xs text-ink-500">{formatBytes(file.size)} before compression</p>
            </div>
            {!busy && (
              <button
                type="button"
                onClick={reset}
                className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-500 hover:bg-ink-100"
              >
                <Icon name="x" label="Cancel" />
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="media-title" className="text-sm font-medium text-ink-700">
                Title learners will see
              </label>
              <input
                id="media-title"
                value={title}
                disabled={busy}
                onChange={(e) => setTitle(e.target.value)}
                className="min-h-11 rounded-lg border border-ink-300 px-3 py-2 text-base outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100 sm:text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="media-lesson" className="text-sm font-medium text-ink-700">
                Show it on
              </label>
              <select
                id="media-lesson"
                value={lessonId}
                disabled={busy}
                onChange={(e) => setLessonId(e.target.value)}
                className="min-h-11 rounded-lg border border-ink-300 bg-white px-3 py-2 text-base outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100 sm:text-sm"
              >
                <option value="">Whole course (resources)</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {kind !== "DOCUMENT" && (
            <div className="flex flex-col gap-3 rounded-xl border border-highlight-100 bg-highlight-100/40 p-3">
              <p className="flex items-start gap-2 text-sm text-ink-700">
                <Icon name="captions" size={18} className="mt-0.5 shrink-0 text-highlight-700" />
                <span>
                  <strong className="font-semibold text-ink-900">Please add a transcript in English or Krio.</strong>{" "}
                  The AI study buddy can&apos;t hear recordings, so it uses the transcript to explain this{" "}
                  {kind === "VIDEO" ? "video" : "audio"} to learners. You can also add it later.
                </span>
              </p>
              <TranscriptFields
                text={transcript}
                language={transcriptLanguage}
                disabled={busy}
                onChange={(text, language) => {
                  setTranscript(text);
                  setTranscriptLanguage(language);
                }}
              />
            </div>
          )}

          {(stage.name === "compressing" || stage.name === "uploading") && (
            <div aria-live="polite">
              <div className="mb-1 flex justify-between text-xs text-ink-700">
                <span>
                  {stage.name === "compressing"
                    ? "Compressing on this device…"
                    : "Uploading…"}
                </span>
                <span className="tabular-nums">{Math.round(stage.progress * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                <div
                  className={clsx(
                    "h-full rounded-full transition-[width] duration-300",
                    stage.name === "compressing" ? "bg-highlight-500" : "bg-brand-600",
                  )}
                  style={{ width: `${Math.round(stage.progress * 100)}%` }}
                />
              </div>
              {stage.name === "compressing" && kind === "VIDEO" && (
                <p className="mt-2 text-xs text-ink-500">
                  Keep this tab open. Long videos can take a few minutes.
                </p>
              )}
            </div>
          )}

          {stage.name === "unsupported" && (
            <Alert tone="info" title="This browser can't compress this file">
              {stage.reason} You can upload the original ({formatBytes(file.size)}), or try
              again in a current version of Chrome, Edge or Safari, which compress it first.
            </Alert>
          )}
          {stage.name === "error" && <Alert tone="danger" title={stage.message} />}

          {!busy && (
            <div className="flex flex-wrap gap-2">
              {stage.name === "unsupported" ? (
                <Button onClick={() => upload(true)} disabled={!title.trim()}>
                  <Icon name="upload" size={18} /> Upload original
                </Button>
              ) : (
                <Button onClick={() => upload(false)} disabled={!title.trim()}>
                  <Icon name="upload" size={18} /> Compress and upload
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {stage.name === "done" && (
        <Alert tone="success" title="Uploaded">
          {stage.saved ? `Compressed ${stage.saved}.` : "Saved as it was; it was already compact."}
        </Alert>
      )}

      {media.length > 0 ? (
        <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-100 bg-white">
          {media.map((item) => {
            const icon: IconName = item.kind === "VIDEO" ? "video" : item.kind === "AUDIO" ? "audio" : "document";
            const saving =
              item.originalSizeBytes > item.sizeBytes
                ? Math.round((1 - item.sizeBytes / item.originalSizeBytes) * 100)
                : 0;
            return (
              <li key={item.id} className="flex flex-col gap-3 p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <Icon name={icon} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <a
                      href={`/api/media/${item.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-medium text-ink-900 hover:text-brand-600 hover:underline"
                    >
                      {item.title}
                    </a>
                    <p className="truncate text-xs text-ink-500">
                      {lessonLabel(item.lessonId)}
                      {" · "}
                      {formatBytes(item.sizeBytes)}
                      {item.durationSeconds ? ` · ${formatDuration(item.durationSeconds)}` : ""}
                      {saving > 0 ? ` · ${saving}% smaller than the original` : ""}
                    </p>
                    {item.kind !== "DOCUMENT" && (
                      <button
                        type="button"
                        onClick={() => setEditingTranscript(editingTranscript === item.id ? null : item.id)}
                        className={clsx(
                          "mt-1 inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full px-2.5 text-xs font-semibold",
                          item.transcript
                            ? "bg-brand-50 text-brand-700 hover:bg-brand-100"
                            : "bg-highlight-100 text-highlight-700 hover:bg-highlight-100/70",
                        )}
                      >
                        <Icon name="captions" size={14} />
                        {item.transcript
                          ? `Transcript (${TRANSCRIPT_LANGUAGES[isTranscriptLanguage(item.transcriptLanguage) ? item.transcriptLanguage : "en"]}) · Edit`
                          : "No transcript yet · Add one"}
                      </button>
                    )}
                  </div>
                  {confirming === item.id ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="danger"
                        className="min-h-9 px-3"
                        onClick={() => remove(item.id)}
                        disabled={deleting === item.id}
                      >
                        {deleting === item.id ? "Deleting…" : "Delete"}
                      </Button>
                      <Button variant="ghost" className="min-h-9 px-3" onClick={() => setConfirming(null)}>
                        Keep
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(item.id)}
                      className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg text-danger-500 hover:bg-danger-100"
                    >
                      <Icon name="trash" size={18} label={`Delete ${item.title}`} />
                    </button>
                  )}
                </div>
                {editingTranscript === item.id && (
                  <TranscriptEditor
                    mediaId={item.id}
                    initialText={item.transcript ?? ""}
                    initialLanguage={isTranscriptLanguage(item.transcriptLanguage) ? item.transcriptLanguage : "en"}
                    onCancel={() => setEditingTranscript(null)}
                    onSaved={() => {
                      setEditingTranscript(null);
                      router.refresh();
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-500">
          No media yet. Videos, audio and documents you add appear on the lesson you choose,
          or in the course resources.
        </p>
      )}
    </div>
  );
}
