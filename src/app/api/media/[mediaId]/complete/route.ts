import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { deleteStored, storedSize } from "@/lib/storage";

// Step 2 of an upload: checks the bytes really arrived (and match the size
// that was registered) before learners can see the file.
export async function POST(
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
  if (!media) return NextResponse.json({ error: "Upload not found." }, { status: 404 });
  if (!canManageCourse(session, media.course.instructorId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (media.status === "READY") return NextResponse.json({ ok: true });

  const size = await storedSize(media.storageKey);
  if (size === null) {
    return NextResponse.json({ error: "The file hasn't arrived in storage yet." }, { status: 409 });
  }
  if (size !== media.sizeBytes) {
    await deleteStored(media.storageKey);
    await prisma.courseMedia.delete({ where: { id: media.id } });
    return NextResponse.json(
      { error: "The stored file doesn't match what was uploaded. Please upload it again." },
      { status: 400 },
    );
  }

  await prisma.courseMedia.update({ where: { id: media.id }, data: { status: "READY" } });
  return NextResponse.json({ ok: true });
}
