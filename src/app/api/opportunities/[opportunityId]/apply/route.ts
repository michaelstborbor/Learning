import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const applySchema = z.object({
  coverNote: z.string().trim().max(2000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ opportunityId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { opportunityId } = await params;
  const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opportunity || opportunity.status !== "OPEN") {
    return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  }

  const existing = await prisma.application.findUnique({
    where: { opportunityId_learnerId: { opportunityId, learnerId: session.userId } },
  });
  if (existing) {
    return NextResponse.json({ error: "You've already applied." }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const application = await prisma.application.create({
    data: {
      opportunityId,
      learnerId: session.userId,
      coverNote: parsed.data.coverNote,
    },
  });

  return NextResponse.json(application, { status: 201 });
}
