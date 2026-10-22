import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { createUploadTarget, maxUploadBytes } from "@/lib/storage";
import { formatBytes, isAllowedType, safeFileName } from "@/lib/media";
import { MAX_TRANSCRIPT_CHARS, cleanTranscript } from "@/lib/transcript";

const createSchema = z.object({
  kind: z.enum(["VIDEO", "AUDIO", "DOCUMENT"]),
  title: z.string().trim().min(1, "Give the file a title.").max(200),
  lessonId: z.string().optional().nullable(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(150),
  contentEncoding: z.enum(["gzip"]).optional().nullable(),
  sizeBytes: z.number().int().positive(),
  originalSizeBytes: z.number().int().positive(),
  durationSeconds: z.number().nonnegative().optional().nullable(),
  transcript: z.string().max(MAX_TRANSCRIPT_CHARS).optional().nullable(),
  transcriptLanguage: z.enum(["en", "kri"]).optional().nullable(),
});

const EXTENSION: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/mp4": "m4a",
  "audio/webm": "weba",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
};

// Step 1 of an upload: the browser has already compressed the file and now
// registers it. The response says where to send the bytes (a signed bucket
// URL, or this app's own upload route when storing on local disk); step 2
// is POST /api/media/[mediaId]/complete once the bytes are there.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  if (!canManageCourse(session, course.instructorId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const mimeType = input.mimeType.split(";")[0].trim().toLowerCase();

  if (!isAllowedType(input.kind, mimeType)) {
    return NextResponse.json(
      {
        error:
          input.kind === "DOCUMENT"
            ? "That document type isn't supported. Use PDF, Word, PowerPoint, Excel, OpenDocument, EPUB, ZIP, CSV, Markdown or plain text."
            : `That ${input.kind.toLowerCase()} format can't be played in browsers. Let the uploader compress it, or convert it to MP4.`,
      },
      { status: 400 },
    );
  }
  if (input.contentEncoding && input.kind !== "DOCUMENT") {
    return NextResponse.json({ error: "Only documents can be gzip-compressed." }, { status: 400 });
  }
  const limit = maxUploadBytes();
  if (input.sizeBytes > limit) {
    return NextResponse.json(
      { error: `Files can be at most ${formatBytes(limit)} after compression.` },
      { status: 413 },
    );
  }
  if (input.lessonId) {
    const lesson = await prisma.lesson.findFirst({
      where: { id: input.lessonId, module: { courseId } },
      select: { id: true },
    });
    if (!lesson) {
      return NextResponse.json({ error: "That lesson isn't part of this course." }, { status: 400 });
    }
  }

  const fileName = safeFileName(input.fileName);
  const extension =
    EXTENSION[mimeType] ?? (fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "bin");
  const storageKey = `courses/${courseId}/${input.kind.toLowerCase()}/${randomBytes(12).toString("hex")}.${extension.replace(/[^a-z0-9]/g, "") || "bin"}`;

  const media = await prisma.courseMedia.create({
    data: {
      courseId,
      lessonId: input.lessonId || null,
      kind: input.kind,
      title: input.title,
      fileName,
      mimeType,
      contentEncoding: input.contentEncoding ?? null,
      sizeBytes: input.sizeBytes,
      originalSizeBytes: input.originalSizeBytes,
      durationSeconds:
        input.durationSeconds !== null && input.durationSeconds !== undefined
          ? Math.round(input.durationSeconds)
          : null,
      ...transcriptFields(input),
      storageKey,
      uploadedById: session.userId,
    },
  });

  const upload = await createUploadTarget(storageKey, media.id, mimeType, media.contentEncoding);
  return NextResponse.json({ id: media.id, upload }, { status: 201 });
}

function transcriptFields(input: z.infer<typeof createSchema>) {
  const transcript = input.kind === "DOCUMENT" ? "" : cleanTranscript(input.transcript ?? "");
  return transcript
    ? { transcript, transcriptLanguage: input.transcriptLanguage ?? "en" }
    : { transcript: null, transcriptLanguage: null };
}
