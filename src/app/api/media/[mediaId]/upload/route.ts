import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { storageDriver, writeLocal } from "@/lib/storage";

// Receives the file bytes when media is stored on the server's own disk
// (STORAGE_DRIVER=local). With S3 storage the browser uploads straight to
// the bucket instead and this route is never used.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  if (storageDriver() !== "local") {
    return NextResponse.json({ error: "Uploads go directly to storage." }, { status: 400 });
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
  if (!request.body) return NextResponse.json({ error: "No file received." }, { status: 400 });

  try {
    // The declared (already compressed) size is the hard ceiling.
    await writeLocal(media.storageKey, request.body, media.sizeBytes);
  } catch {
    return NextResponse.json(
      { error: "The upload was interrupted or larger than declared. Please try again." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
