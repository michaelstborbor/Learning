import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageOrganization } from "@/lib/permissions";
import { generateToken } from "@/lib/tokens";
import { sendEmail, buildCohortInviteEmail } from "@/lib/notifications";

const INVITE_EXPIRY_DAYS = 7;

const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
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
    include: { organization: true, course: true },
  });
  if (!cohort || !cohort.organization) {
    return NextResponse.json({ error: "Cohort not found." }, { status: 404 });
  }
  if (!canManageOrganization(session, cohort.organization.ownerId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const learner = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (!learner) {
    // No account yet: send a real invite instead of erroring (this is
    // what Stage F2 added — see ARCHITECTURE.md's Notifications section).
    // Accepting the invite happens at registration time
    // (api/auth/register), not here.
    const { raw, hash } = generateToken();
    await prisma.cohortInvitation.create({
      data: {
        cohortId,
        email: parsed.data.email,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    const message = buildCohortInviteEmail(
      cohort.title,
      cohort.course.title,
      cohort.organization.name,
      raw,
    );
    await sendEmail({ ...message, to: parsed.data.email });

    return NextResponse.json(
      { invited: true, message: "No account found — an invite email was sent instead." },
      { status: 202 },
    );
  }

  const existingMember = await prisma.cohortMember.findUnique({
    where: { cohortId_learnerId: { cohortId, learnerId: learner.id } },
  });
  if (existingMember) {
    return NextResponse.json({ error: "Already in this cohort." }, { status: 409 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
  const member = await prisma.$transaction(async (tx: any) => {
    // Joining a cohort also enrols the learner in the underlying course, so
    // all existing progress/quiz/project/certificate machinery just works
    // — a cohort is a grouping and attendance layer on top of a normal
    // enrolment, not a separate progress-tracking system.
    await tx.enrolment.upsert({
      where: { learnerId_courseId: { learnerId: learner.id, courseId: cohort.courseId } },
      update: {},
      create: { learnerId: learner.id, courseId: cohort.courseId },
    });

    return tx.cohortMember.create({
      data: { cohortId, learnerId: learner.id },
    });
  });

  return NextResponse.json(member, { status: 201 });
}
