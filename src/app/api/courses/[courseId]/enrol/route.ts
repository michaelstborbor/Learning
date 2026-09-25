import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const existing = await prisma.enrolment.findUnique({
    where: { learnerId_courseId: { learnerId: session.userId, courseId } },
  });
  if (existing) {
    return NextResponse.json(existing);
  }

  const enrolment = await prisma.enrolment.create({
    data: { learnerId: session.userId, courseId },
  });

  return NextResponse.json(enrolment, { status: 201 });
}
