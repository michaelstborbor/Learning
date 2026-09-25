import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ORGANIZATION_ROLES } from "@/lib/roles";

const createOrgSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required."),
  description: z.string().trim().min(10, "Add a short description."),
  website: z.string().trim().url("Enter a valid URL.").optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const session = await requireRole(ORGANIZATION_ROLES);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const existing = await prisma.organization.findUnique({
    where: { ownerId: session.userId },
  });
  if (existing) {
    return NextResponse.json({ error: "You already have an organization profile." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const org = await prisma.organization.create({
    data: {
      ownerId: session.userId,
      name: parsed.data.name,
      description: parsed.data.description,
      website: parsed.data.website || undefined,
    },
  });

  return NextResponse.json(org, { status: 201 });
}
