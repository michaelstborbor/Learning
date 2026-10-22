import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse, canUpdateCourseContent } from "@/lib/permissions";
import { deleteStored, putObject, readObject } from "@/lib/storage";
import { coursePosterUrl } from "@/lib/course-poster";
import { IMAGE_EXTENSION, imageType } from "@/lib/image-type";

// The course poster: one image per course, shown on course cards and at
// the top of the course page. The browser shrinks it to a WebP before
// upload (see src/lib/poster-image.ts), so it always fits in one request.

const MAX_POSTER_BYTES = 3 * 1024 * 1024;

async function managedCourse(courseId: string) {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Not authorized." }, { status: 403 }) };
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: NextResponse.json({ error: "Course not found." }, { status: 404 }) };
  if (!canUpdateCourseContent(session, course)) {
    return { error: NextResponse.json({ error: "Not authorized." }, { status: 403 }) };
  }
  return { course };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { status: true, instructorId: true, posterKey: true },
  });
  if (!course?.posterKey) return NextResponse.json({ error: "No poster." }, { status: 404 });

  const isPublic = course.status === "PUBLISHED";
  if (!isPublic) {
    const session = await getSession();
    if (!session || !canManageCourse(session, course.instructorId)) {
      return NextResponse.json({ error: "No poster." }, { status: 404 });
    }
  }

  const bytes = await readObject(course.posterKey);
  const type = bytes && imageType(bytes);
  if (!bytes || !type) return NextResponse.json({ error: "No poster." }, { status: 404 });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(bytes.length),
      "X-Content-Type-Options": "nosniff",
      // The URL carries ?v=<updated time>, so a new poster gets a new URL.
      "Cache-Control": isPublic ? "public, max-age=31536000, immutable" : "private, max-age=3600",
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const result = await managedCourse(courseId);
  if (result.error) return result.error;
  const { course } = result;

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length === 0) return NextResponse.json({ error: "No image received." }, { status: 400 });
  if (bytes.length > MAX_POSTER_BYTES) {
    return NextResponse.json({ error: "The poster must be smaller than 3 MB." }, { status: 413 });
  }
  const type = imageType(bytes);
  if (!type) {
    return NextResponse.json({ error: "Use a JPG, PNG or WebP image for the poster." }, { status: 400 });
  }

  const key = `courses/${course.id}/poster/${randomBytes(9).toString("base64url")}.${IMAGE_EXTENSION[type]}`;
  await putObject(key, bytes, type);
  const updated = await prisma.course.update({
    where: { id: course.id },
    data: { posterKey: key, posterUpdatedAt: new Date() },
    select: { id: true, posterKey: true, posterUpdatedAt: true },
  });
  if (course.posterKey) await deleteStored(course.posterKey).catch(() => {});

  return NextResponse.json({ posterUrl: coursePosterUrl(updated) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const result = await managedCourse(courseId);
  if (result.error) return result.error;
  const { course } = result;

  if (course.posterKey) {
    await prisma.course.update({ where: { id: course.id }, data: { posterKey: null, posterUpdatedAt: null } });
    await deleteStored(course.posterKey).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
