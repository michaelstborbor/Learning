import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { storageDriver } from "@/lib/storage";

// Hands the browser a one-off token for uploading one registered file
// straight to Vercel Blob (STORAGE_DRIVER=blob). The token only allows the
// storage key, type and size that were registered, so it can't be reused
// to write anything else into the store.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  if (storageDriver() !== "blob") {
    return NextResponse.json({ error: "Uploads don't use Vercel Blob here." }, { status: 400 });
  }
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { mediaId } = await params;
  const media = await prisma.courseMedia.findUnique({
    where: { id: mediaId },
    include: { course: { select: { instructorId: true } } },
  });
  if (!media) return NextResponse.json({ error: "Upload not found." }, { status: 404 });
  if (!canManageCourse(session, media.course.instructorId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (media.status !== "UPLOADING") {
    return NextResponse.json({ error: "This file has already been uploaded." }, { status: 409 });
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (pathname !== media.storageKey) throw new Error("Unexpected upload path.");
        return {
          allowedContentTypes: [media.mimeType],
          maximumSizeInBytes: media.sizeBytes,
          addRandomSuffix: false,
          validUntil: Date.now() + 60 * 60 * 1000,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't start the upload." },
      { status: 400 },
    );
  }
}
