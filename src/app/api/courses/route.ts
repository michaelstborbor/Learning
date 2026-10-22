import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { COURSE_AUTHOR_ROLES } from "@/lib/roles";
import { slugify } from "@/lib/slugify";
import { hoursFromMinutes } from "@/lib/course-duration";

export async function GET() {
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    include: { instructor: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(courses);
}

const createCourseSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200, "Keep the title under 200 characters."),
  description: z.string().trim().min(10, "Add a short description.").max(5000, "Keep the description under 5,000 characters."),
  category: z.string().trim().min(2, "Category is required.").max(80),
  level: z.string().trim().min(2, "Level is required.").max(40),
  estimatedHours: z.number().int().positive().max(2000).default(1),
  // Hours and minutes from the course form, as total minutes.
  durationMinutes: z.number().int().min(5, "A course needs at least 5 minutes.").max(100000).optional(),
});

export async function POST(request: Request) {
  const session = await requireRole(COURSE_AUTHOR_ROLES);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createCourseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const { title, description, category, level, durationMinutes } = parsed.data;
  const estimatedHours = durationMinutes ? hoursFromMinutes(durationMinutes) : parsed.data.estimatedHours;
  const baseSlug = slugify(title);

  // Guard against slug collisions rather than trusting titles to be unique.
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.course.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const course = await prisma.course.create({
    data: {
      title,
      description,
      category,
      level,
      estimatedHours,
      durationMinutes: durationMinutes ?? null,
      slug,
      instructorId: session.userId,
      status: "DRAFT",
    },
  });

  return NextResponse.json(course, { status: 201 });
}
