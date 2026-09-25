import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageOrganization } from "@/lib/permissions";

const attendanceSchema = z.object({
  sessionDate: z.string().min(1, "Set a session date."),
  // Map of learnerId -> present (boolean)
  records: z.record(z.string(), z.boolean()),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cohortId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { cohortId } = await params;
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    include: { organization: true },
  });
  if (!cohort || !cohort.organization) {
    return NextResponse.json({ error: "Cohort not found." }, { status: 404 });
  }
  if (!canManageOrganization(session, cohort.organization.ownerId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = attendanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const sessionDate = new Date(parsed.data.sessionDate);

  // Found in the Stage F4 audit: the request body's learnerId keys were
  // being trusted without checking they're actually members of this
  // cohort — an authorized org admin (or a client bug) could otherwise
  // write attendance records for arbitrary learner ids, which is both a
  // data-integrity problem and, per Rule 8, a scope violation (an org
  // should only write its own training data). Cross-check against real
  // membership before writing anything.
  const members = await prisma.cohortMember.findMany({
    where: { cohortId },
    select: { learnerId: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
  const memberIds = new Set(members.map((m: any) => m.learnerId));
  const invalidIds = Object.keys(parsed.data.records).filter((id) => !memberIds.has(id));
  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: "One or more learners aren't members of this cohort." },
      { status: 400 },
    );
  }

  await Promise.all(
    Object.entries(parsed.data.records).map(([learnerId, present]) =>
      prisma.attendanceRecord.upsert({
        where: {
          cohortId_learnerId_sessionDate: { cohortId, learnerId, sessionDate },
        },
        update: { present },
        create: { cohortId, learnerId, sessionDate, present },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
