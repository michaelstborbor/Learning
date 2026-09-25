import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageOrganization } from "@/lib/permissions";

const cohortSchema = z.object({
  courseId: z.string().min(1, "Choose a course."),
  title: z.string().trim().min(2, "Give the cohort a title."),
  startDate: z.string().min(1, "Set a start date."),
  endDate: z.string().min(1, "Set an end date."),
  location: z.string().trim().optional(),
  deliveryMode: z.enum(["ONLINE", "OFFLINE", "HYBRID"]).default("ONLINE"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { organizationId } = await params;
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!organization) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }
  if (!canManageOrganization(session, organization.ownerId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = cohortSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const course = await prisma.course.findUnique({ where: { id: parsed.data.courseId } });
  if (!course || course.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "Choose a published course for this cohort." },
      { status: 400 },
    );
  }

  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  if (endDate < startDate) {
    return NextResponse.json({ error: "End date can't be before the start date." }, { status: 400 });
  }

  const cohort = await prisma.cohort.create({
    data: {
      organizationId,
      courseId: parsed.data.courseId,
      title: parsed.data.title,
      startDate,
      endDate,
      location: parsed.data.location || undefined,
      deliveryMode: parsed.data.deliveryMode,
    },
  });

  return NextResponse.json(cohort, { status: 201 });
}
