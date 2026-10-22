import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { hoursFromMinutes } from "@/lib/course-duration";
import { deleteStored } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit-log";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: { select: { id: true, fullName: true } },
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
      // Summary only: answers (and which are correct) must never be sent
      // from a public endpoint. Learners load questions via /api/quiz.
      quizzes: {
        select: { id: true, title: true, moduleId: true, passMarkPercent: true, timeLimitMinutes: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
      project: true,
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  if (course.status !== "PUBLISHED") {
    const session = await getSession();
    if (!session || !canManageCourse(session, course.instructorId)) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }
  }

  return NextResponse.json(course);
}

const updateCourseSchema = z.object({
  title: z.string().trim().min(3).max(200, "Keep the title under 200 characters.").optional(),
  description: z.string().trim().min(10).max(5000, "Keep the description under 5,000 characters.").optional(),
  category: z.string().trim().min(2).max(80).optional(),
  level: z.string().trim().min(2).max(40).optional(),
  estimatedHours: z.number().int().positive().max(2000).optional(),
  durationMinutes: z.number().int().min(5, "A course needs at least 5 minutes.").max(100000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  if (!canManageCourse(session, course.instructorId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateCourseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: {
      ...parsed.data,
      ...(parsed.data.durationMinutes && { estimatedHours: hoursFromMinutes(parsed.data.durationMinutes) }),
    },
  });

  return NextResponse.json(updated);
}

const deleteCourseSchema = z.object({
  // The course title typed back in the confirmation box, so a stray click
  // can't delete a course.
  confirmTitle: z.string().max(300),
});

// Removes a course for good: its modules, lessons, quizzes, project, media
// files, poster, cohorts, enrolments, progress and study buddy chats.
//
// Two guards keep learners' records safe:
// - A course that has issued certificates can't be deleted, because
//   certificates must stay verifiable. It can be archived instead.
// - Only an administrator can delete a course learners are enrolled in;
//   an instructor can delete their own course while nobody is enrolled.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      instructorId: true,
      posterKey: true,
      media: { select: { storageKey: true } },
      _count: { select: { enrolments: true, certificates: true } },
    },
  });
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  if (!canManageCourse(session, course.instructorId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const parsed = deleteCourseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.confirmTitle.trim() !== course.title.trim()) {
    return NextResponse.json(
      { error: "Type the course title exactly as shown to confirm." },
      { status: 400 },
    );
  }

  if (course._count.certificates > 0) {
    return NextResponse.json(
      {
        error:
          "Learners have earned certificates from this course, and certificates must stay verifiable, so it can't be deleted. Ask an administrator to archive it instead.",
      },
      { status: 409 },
    );
  }
  const isAdmin = session.role === "PLATFORM_ADMIN" || session.role === "SUPER_ADMIN";
  if (course._count.enrolments > 0 && !isAdmin) {
    return NextResponse.json(
      {
        error: `${course._count.enrolments} learner${course._count.enrolments === 1 ? " is" : "s are"} enrolled in this course, so only an administrator can delete it.`,
      },
      { status: 409 },
    );
  }

  // Rows that don't cascade from the course are removed first, all in one
  // transaction, so a failure leaves the course exactly as it was.
  await prisma.$transaction(async (tx) => {
    await tx.projectSubmission.deleteMany({ where: { project: { courseId } } });
    await tx.cohortMember.deleteMany({ where: { cohort: { courseId } } });
    await tx.attendanceRecord.deleteMany({ where: { cohort: { courseId } } });
    await tx.cohortInvitation.deleteMany({ where: { cohort: { courseId } } });
    await tx.cohort.deleteMany({ where: { courseId } });
    await tx.enrolment.deleteMany({ where: { courseId } });
    await tx.course.delete({ where: { id: courseId } });
  });

  await writeAuditLog({
    actorId: session.userId,
    action: "COURSE_DELETED",
    targetType: "Course",
    targetId: courseId,
    notes: `"${course.title}" (${course._count.enrolments} enrolments)`,
  });

  // Stored files go last: if one can't be removed now, the course is still
  // gone and the file is simply orphaned in storage.
  const keys = [...course.media.map((m) => m.storageKey), ...(course.posterKey ? [course.posterKey] : [])];
  const results = await Promise.allSettled(keys.map((key) => deleteStored(key)));
  results.forEach((result, i) => {
    if (result.status === "rejected") console.error("Couldn't delete stored file", keys[i], result.reason);
  });

  return NextResponse.json({ ok: true });
}
