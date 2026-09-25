import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";

const projectSchema = z.object({
  title: z.string().trim().min(3),
  instructions: z.string().trim().min(10),
  rubric: z.string().trim().min(10),
  skillName: z.string().trim().min(2).optional(),
  skillCategory: z.string().trim().min(2).optional(),
});

export async function PUT(
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

  const body = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const { title, instructions, rubric, skillName, skillCategory } = parsed.data;

  let skillId: string | undefined;
  if (skillName) {
    const skill = await prisma.skill.upsert({
      where: { name: skillName },
      update: {},
      create: { name: skillName, category: skillCategory ?? "General" },
    });
    skillId = skill.id;
  }

  const project = await prisma.project.upsert({
    where: { courseId },
    update: { title, instructions, rubric, skillId },
    create: { courseId, title, instructions, rubric, skillId },
  });

  return NextResponse.json(project);
}
