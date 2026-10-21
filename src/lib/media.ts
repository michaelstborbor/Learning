import type { MediaKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionPayload } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { REVIEWER_ROLES } from "@/lib/roles";

// Allowed upload types per media kind. HTML, SVG, XML and scripts are never
// accepted: served from this origin they could run code in a viewer's
// session. Everything is also served with a sandbox CSP as a second line.
const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/rtf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/epub+zip",
  "application/zip",
]);

const PLAYABLE_VIDEO = new Set(["video/mp4", "video/webm"]);
const PLAYABLE_AUDIO = new Set(["audio/mp4", "audio/webm", "audio/mpeg", "audio/ogg", "audio/aac", "audio/wav"]);

export function isAllowedType(kind: MediaKind, mimeType: string): boolean {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  if (kind === "VIDEO") return PLAYABLE_VIDEO.has(base);
  if (kind === "AUDIO") return PLAYABLE_AUDIO.has(base);
  return DOCUMENT_TYPES.has(base);
}

/** Documents that are safe to open in the browser tab; everything else
 * downloads. */
export function opensInline(kind: MediaKind, mimeType: string): boolean {
  if (kind !== "DOCUMENT") return true;
  return mimeType === "application/pdf" || mimeType === "text/plain";
}

export function contentDisposition(fileName: string, inline: boolean): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export function safeFileName(name: string): string {
  const cleaned = name.replace(/[/\\?%*:|"<>\x00-\x1f]/g, "_").trim();
  return (cleaned || "file").slice(0, 180);
}

/** Who may open a course's media: anyone who can manage the course,
 * content reviewers (they review the whole course), and enrolled learners. */
export async function canViewCourseMedia(
  session: SessionPayload,
  course: { id: string; instructorId: string },
): Promise<boolean> {
  if (canManageCourse(session, course.instructorId)) return true;
  if (REVIEWER_ROLES.includes(session.role)) return true;
  const enrolment = await prisma.enrolment.findUnique({
    where: { learnerId_courseId: { learnerId: session.userId, courseId: course.id } },
    select: { id: true },
  });
  return Boolean(enrolment);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${m}:${rest}`;
}
