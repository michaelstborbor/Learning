"use client";

import { useState } from "react";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";

// Plays a video or audio file right here on the page: no new tab, no
// leaving the course. The file streams from /api/media/[id], which checks
// the viewer may see it and supports seeking.
export function InlinePlayer({
  id,
  kind,
  title,
  autoPlay = false,
  className,
}: {
  id: string;
  kind: "VIDEO" | "AUDIO";
  title: string;
  autoPlay?: boolean;
  className?: string;
}) {
  if (kind === "VIDEO") {
    return (
      <video
        controls
        playsInline
        autoPlay={autoPlay}
        preload="metadata"
        aria-label={title}
        className={clsx("aspect-video w-full rounded-xl bg-ink-950", className)}
        src={`/api/media/${id}`}
      >
        <a href={`/api/media/${id}?download`}>Download the video</a>
      </video>
    );
  }
  return (
    <audio
      controls
      autoPlay={autoPlay}
      preload={autoPlay ? "auto" : "none"}
      aria-label={title}
      className={clsx("w-full", className)}
      src={`/api/media/${id}`}
    >
      <a href={`/api/media/${id}?download`}>Download the audio</a>
    </audio>
  );
}

/** A row that opens a player in place when pressed. */
export function PlayableMediaRow({
  id,
  kind,
  title,
  detail,
  compact = false,
}: {
  id: string;
  kind: "VIDEO" | "AUDIO";
  title: string;
  detail: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={clsx("rounded-xl", !compact && "border border-ink-100 bg-white p-3", compact && "py-1.5")}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg text-left hover:bg-brand-50/60"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-white">
            <Icon name={open ? "x" : "play"} size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink-900">{title}</span>
            <span className="block truncate text-xs text-ink-500">
              {open ? "Playing here. Press again to close." : `${kind === "VIDEO" ? "Watch" : "Listen"} · ${detail}`}
            </span>
          </span>
        </button>
        <a
          href={`/api/media/${id}?download`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-brand-600 hover:bg-brand-50"
        >
          <Icon name="download" size={18} label={`Download ${title}`} />
        </a>
      </div>
      {open && <InlinePlayer id={id} kind={kind} title={title} autoPlay className="mt-2" />}
    </div>
  );
}
