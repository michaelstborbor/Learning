import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import {
  boundedRange,
  deleteStored,
  readBlob,
  readLocal,
  signedDownloadUrl,
  storageDriver,
  storedSize,
} from "@/lib/storage";
import { canViewCourseMedia, contentDisposition, opensInline } from "@/lib/media";
import { MAX_TRANSCRIPT_CHARS, cleanTranscript } from "@/lib/transcript";

// Uploaded files are untrusted content: never sniffed, never scripted.
// (PDFs skip the sandbox CSP only because Chrome refuses to open its PDF
// viewer inside a sandbox; the viewer runs isolated from this origin.)
function safeHeaders(mimeType: string): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=3600",
  };
  if (mimeType !== "application/pdf") {
    headers["Content-Security-Policy"] = "sandbox; default-src 'none'";
  }
  return headers;
}

function parseRange(header: string | null, size: number) {
  const match = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  let start = match[1] ? Number(match[1]) : NaN;
  let end = match[2] ? Number(match[2]) : size - 1;
  if (Number.isNaN(start)) {
    // "bytes=-500" = the last 500 bytes.
    start = Math.max(0, size - end);
    end = size - 1;
  }
  end = Math.min(end, size - 1);
  if (start > end || start >= size) return "invalid" as const;
  return { start, end };
}

// Streams (from disk or Vercel Blob; with S3 storage it redirects to a short-lived signed URL for)
// one media file. Video and audio support Range requests so learners can
// seek without downloading the whole file.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { mediaId } = await params;
  const media = await prisma.courseMedia.findUnique({
    where: { id: mediaId },
    include: { course: { select: { id: true, instructorId: true } } },
  });
  if (!media || media.status !== "READY") {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  if (!(await canViewCourseMedia(session, media.course))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const wantsDownload = new URL(request.url).searchParams.has("download");
  const disposition = contentDisposition(
    media.fileName,
    !wantsDownload && opensInline(media.kind, media.mimeType),
  );

  if (storageDriver() === "s3") {
    const url = await signedDownloadUrl(media.storageKey, {
      contentType: media.mimeType,
      disposition,
    });
    return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
  }

  const size = await storedSize(media.storageKey);
  if (size === null) return NextResponse.json({ error: "File not found." }, { status: 404 });

  const blob = storageDriver() === "blob";
  const read = async (range?: { start: number; end: number }) =>
    blob ? readBlob(media.storageKey, range) : readLocal(media.storageKey, range);

  const headers: Record<string, string> = {
    ...safeHeaders(media.mimeType),
    "Content-Type": media.mimeType,
    "Content-Disposition": disposition,
  };

  if (media.contentEncoding) {
    // Stored gzipped: the browser unzips it transparently.
    headers["Content-Encoding"] = media.contentEncoding;
    headers["Content-Length"] = String(size);
    return new Response(await read(), { status: 200, headers });
  }

  headers["Accept-Ranges"] = "bytes";
  const requested = parseRange(request.headers.get("range"), size);
  // Blob reads are streamed through a function, so each answer is capped.
  const range = blob && requested && requested !== "invalid" ? boundedRange(requested) : requested;
  if (range === "invalid") {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  if (range) {
    headers["Content-Range"] = `bytes ${range.start}-${range.end}/${size}`;
    headers["Content-Length"] = String(range.end - range.start + 1);
    return new Response(await read(range), { status: 206, headers });
  }
  const first = boundedRange({ start: 0, end: size - 1 });
  if (blob && !wantsDownload && media.kind !== "DOCUMENT" && first.end < size - 1) {
    // A player asking without a Range gets the first slice and seeks on.
    headers["Content-Range"] = `bytes ${first.start}-${first.end}/${size}`;
    headers["Content-Length"] = String(first.end + 1);
    return new Response(await read(first), { status: 206, headers });
  }
  headers["Content-Length"] = String(size);
  return new Response(await read(), { status: 200, headers });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { mediaId } = await params;
  const media = await prisma.courseMedia.findUnique({
    where: { id: mediaId },
    include: { course: { select: { instructorId: true } } },
  });
  if (!media) return NextResponse.json({ error: "File not found." }, { status: 404 });
  if (!canManageCourse(session, media.course.instructorId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  await deleteStored(media.storageKey);
  await prisma.courseMedia.delete({ where: { id: media.id } });
  return NextResponse.json({ ok: true });
}

const updateSchema = z.object({
  title: z.string().trim().min(1, "Give the file a title.").max(200).optional(),
  transcript: z
    .string()
    .max(MAX_TRANSCRIPT_CHARS, "That transcript is too long. Split the recording into shorter parts.")
    .nullable()
    .optional(),
  transcriptLanguage: z.enum(["en", "kri"]).optional(),
});

// Edits a file's title or its transcript (video and audio only).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { mediaId } = await params;
  const media = await prisma.courseMedia.findUnique({
    where: { id: mediaId },
    include: { course: { select: { instructorId: true } } },
  });
  if (!media) return NextResponse.json({ error: "File not found." }, { status: 404 });
  if (!canManageCourse(session, media.course.instructorId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { title, transcript, transcriptLanguage } = parsed.data;
  if (transcript && media.kind === "DOCUMENT") {
    return NextResponse.json({ error: "Transcripts are for video and audio." }, { status: 400 });
  }

  const data: { title?: string; transcript?: string | null; transcriptLanguage?: string | null } = {};
  if (title) data.title = title;
  if (transcript !== undefined) {
    const cleaned = cleanTranscript(transcript ?? "");
    data.transcript = cleaned || null;
    data.transcriptLanguage = cleaned ? (transcriptLanguage ?? media.transcriptLanguage ?? "en") : null;
  } else if (transcriptLanguage && media.transcript) {
    data.transcriptLanguage = transcriptLanguage;
  }

  const updated = await prisma.courseMedia.update({
    where: { id: media.id },
    data,
    select: { id: true, title: true, transcript: true, transcriptLanguage: true },
  });
  return NextResponse.json(updated);
}
