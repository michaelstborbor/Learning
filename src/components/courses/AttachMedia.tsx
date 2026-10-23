"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { MediaUploadPanel, type MediaTarget } from "./MediaManager";
import { InlinePlayer } from "./InlinePlayer";

export interface AttachedMediaItem {
  id: string;
  kind: "VIDEO" | "AUDIO" | "DOCUMENT";
  title: string;
}

const KIND_ICON: Record<AttachedMediaItem["kind"], IconName> = {
  VIDEO: "video",
  AUDIO: "audio",
  DOCUMENT: "document",
};

// The files already on a module or lesson, and an "Add video or audio"
// button that uploads straight to it. Transcripts and removal stay in the
// Media section, which lists every file.
export function AttachMedia({
  courseId,
  target,
  name,
  media,
}: {
  courseId: string;
  target: MediaTarget;
  // "module 2" or "lesson 1.3", for labels read by screen readers.
  name: string;
  media: AttachedMediaItem[];
}) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const playingItem = media.find((item) => item.id === playing && item.kind !== "DOCUMENT");
  const idPrefix = `attach-${target.lessonId ?? target.moduleId ?? "course"}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {media.map((item) =>
          item.kind === "DOCUMENT" ? (
            <a
              key={item.id}
              href={`/api/media/${item.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-8 max-w-full items-center gap-1 text-xs text-brand-700 hover:underline"
            >
              <Icon name={KIND_ICON[item.kind]} size={14} className="shrink-0" />
              <span className="truncate">{item.title}</span>
            </a>
          ) : (
            <button
              key={item.id}
              type="button"
              onClick={() => setPlaying(playing === item.id ? null : item.id)}
              aria-expanded={playing === item.id}
              className="inline-flex min-h-8 max-w-full cursor-pointer items-center gap-1 text-xs text-brand-700 hover:underline"
            >
              <Icon name={playing === item.id ? "x" : KIND_ICON[item.kind]} size={14} className="shrink-0" />
              <span className="truncate">{item.title}</span>
              <span className="sr-only">{playing === item.id ? ", stop playing" : ", play here"}</span>
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={`${idPrefix}-panel`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
        >
          <Icon name={open ? "x" : "video"} size={16} />
          {open ? "Close" : "Add video or audio"}
          <span className="sr-only"> to {name}</span>
        </button>
      </div>
      {playingItem && playingItem.kind !== "DOCUMENT" && (
        <InlinePlayer id={playingItem.id} kind={playingItem.kind} title={playingItem.title} autoPlay className="max-w-xl" />
      )}
      {open && (
        <div id={`${idPrefix}-panel`} className="rounded-xl border border-ink-100 bg-ink-50/60 p-3">
          <MediaUploadPanel courseId={courseId} kinds={["VIDEO", "AUDIO"]} target={target} idPrefix={idPrefix} compact />
        </div>
      )}
    </div>
  );
}
