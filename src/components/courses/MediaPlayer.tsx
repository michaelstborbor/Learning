import clsx from "clsx";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatBytes, formatDuration } from "@/lib/media";

export interface MediaItem {
  id: string;
  kind: "VIDEO" | "AUDIO" | "DOCUMENT";
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
}

const KIND_ICON: Record<MediaItem["kind"], IconName> = {
  VIDEO: "video",
  AUDIO: "audio",
  DOCUMENT: "document",
};

// Native players, no player library: they work everywhere, respect the
// device's own controls and accessibility settings, and `preload` keeps
// data use down until the learner presses play.
export function LessonMedia({ media }: { media: MediaItem[] }) {
  const videos = media.filter((m) => m.kind === "VIDEO");
  const audio = media.filter((m) => m.kind === "AUDIO");
  const documents = media.filter((m) => m.kind === "DOCUMENT");

  return (
    <div className="flex flex-col gap-6">
      {videos.map((video) => (
        <figure key={video.id} className="overflow-hidden rounded-2xl bg-ink-950 shadow-overlay">
          <video
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full bg-ink-950"
            src={`/api/media/${video.id}`}
          >
            <a href={`/api/media/${video.id}?download`}>Download the video</a>
          </video>
          <figcaption className="flex flex-wrap items-center justify-between gap-2 bg-ink-900 px-4 py-2.5 text-sm text-ink-200">
            <span className="font-medium text-white">{video.title}</span>
            <span className="text-xs">
              {video.durationSeconds ? `${formatDuration(video.durationSeconds)} · ` : ""}
              {formatBytes(video.sizeBytes)}
            </span>
          </figcaption>
        </figure>
      ))}

      {audio.map((clip) => (
        <figure key={clip.id} className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
          <figcaption className="mb-3 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
              <Icon name="audio" />
            </span>
            <span>
              <span className="block font-medium text-ink-900">{clip.title}</span>
              <span className="text-xs text-ink-500">
                {clip.durationSeconds ? `${formatDuration(clip.durationSeconds)} · ` : ""}
                {formatBytes(clip.sizeBytes)} · listen offline by downloading
              </span>
            </span>
          </figcaption>
          <audio controls preload="none" className="w-full" src={`/api/media/${clip.id}`}>
            <a href={`/api/media/${clip.id}?download`}>Download the audio</a>
          </audio>
        </figure>
      ))}

      {documents.length > 0 && <MediaResourceList media={documents} />}
    </div>
  );
}

export function MediaResourceList({ media, compact = false }: { media: MediaItem[]; compact?: boolean }) {
  return (
    <ul className={clsx("flex flex-col", compact ? "gap-1" : "gap-2")}>
      {media.map((item) => (
        <li key={item.id}>
          <div
            className={clsx(
              "flex items-center gap-3 rounded-xl",
              compact ? "py-1.5" : "border border-ink-100 bg-white p-3",
            )}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <Icon name={KIND_ICON[item.kind]} size={18} />
            </span>
            <a
              href={`/api/media/${item.id}`}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 hover:underline"
            >
              <span className="block truncate text-sm font-medium text-ink-900">{item.title}</span>
              <span className="block truncate text-xs text-ink-500">
                {item.fileName.split(".").pop()?.toUpperCase()} · {formatBytes(item.sizeBytes)}
              </span>
            </a>
            <a
              href={`/api/media/${item.id}?download`}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-brand-600 hover:bg-brand-50"
            >
              <Icon name="download" size={18} label={`Download ${item.title}`} />
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
