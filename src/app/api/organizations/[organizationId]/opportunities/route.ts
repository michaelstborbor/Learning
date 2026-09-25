import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageOrganization } from "@/lib/permissions";

const opportunitySchema = z.object({
  title: z.string().trim().min(3, "Give the opportunity a title."),
  type: z.enum(["INTERNSHIP", "JOB", "APPRENTICESHIP", "VOLUNTEER", "PROJECT", "MENTORSHIP"]),
  description: z.string().trim().min(10, "Add a description."),
  eligibilityCriteria: z.string().trim().min(5, "Describe who's eligible."),
  location: z.string().trim().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { organizationId } = await params;
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }
  if (!canManageOrganization(session, organization.ownerId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = opportunitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const opportunity = await prisma.opportunity.create({
    data: { organizationId, ...parsed.data },
  });

  return NextResponse.json(opportunity, { status: 201 });
}
