"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { MediaUploadPanel, type MediaTarget } from "./MediaManager";

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
  const idPrefix = `attach-${target.lessonId ?? target.moduleId ?? "course"}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {media.map((item) => (
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
        ))}
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
      {open && (
        <div id={`${idPrefix}-panel`} className="rounded-xl border border-ink-100 bg-ink-50/60 p-3">
          <MediaUploadPanel courseId={courseId} kinds={["VIDEO", "AUDIO"]} target={target} idPrefix={idPrefix} compact />
        </div>
      )}
    </div>
  );
}
