import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { getCourseGrades } from "@/lib/gradebook";
import { slugify } from "@/lib/slugify";

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  // Neutralise spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

// The gradebook as a CSV download, for spreadsheets or a school records system.
export async function GET(_request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  if (!canManageCourse(session, course.instructorId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const enrolments = await prisma.enrolment.findMany({
    where: { courseId },
    include: { learner: { select: { fullName: true, email: true } } },
    orderBy: { enrolledAt: "asc" },
  });
  const { quizzes, project, grades } = await getCourseGrades(
    courseId,
    enrolments.map((e) => e.learnerId),
  );
  const columns = [...quizzes.map((q) => ({ id: q.id, title: q.title })), ...(project ? [project] : [])];

  const rows = [
    ["Learner", "Email", "Lessons %", ...columns.map((c) => c.title), "Course grade %", "Letter"],
    ...enrolments.map((e) => {
      const grade = grades.get(e.learnerId);
      return [
        e.learner.fullName,
        e.learner.email,
        e.progressPercent,
        ...columns.map((c) => grade?.items.find((i) => i.id === c.id)?.score ?? null),
        grade?.currentPercent ?? null,
        grade?.letter ?? null,
      ];
    }),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gradebook-${slugify(course.title)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
