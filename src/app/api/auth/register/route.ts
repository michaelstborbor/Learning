import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { generateToken, hashToken } from "@/lib/tokens";
import { sendEmail, buildVerificationEmail } from "@/lib/notifications";
import { rateLimitOrNull } from "@/lib/rate-limit";

const VERIFICATION_EXPIRY_HOURS = 24;

export async function POST(request: Request) {
  // Looser than login (account creation is a normal, if less frequent,
  // action) but still bounded — mainly a guard against automated mass
  // account creation.
  const limited = rateLimitOrNull(request, "register", { limit: 5, windowSeconds: 600 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const { fullName, email, password } = parsed.data;
  // Optional: a cohort invite token from the emailed invite link (see
  // api/cohorts/[cohortId]/members and lib/notifications). Not validated
  // with zod above since it's not part of the core registration contract
  // — an invalid or missing token just means "not an invited signup",
  // never a registration failure.
  const inviteToken: string | undefined =
    typeof (body as Record<string, unknown> | null)?.inviteToken === "string"
      ? (body as { inviteToken: string }).inviteToken
      : undefined;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Deliberately generic message — don't confirm which emails are
    // registered to an unauthenticated caller (account enumeration).
    return NextResponse.json(
      { error: "That email couldn't be registered. Try logging in instead." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);

  // New accounts default to LEARNER. Every other role (instructor, admin,
  // organization, etc.) is granted by an existing administrator, never
  // self-selected at signup — this is a deliberate privilege-escalation
  // guard, not an oversight.
  const user = await prisma.user.create({
    data: { fullName, email, passwordHash, role: "LEARNER" },
  });

  // Accepting a cohort invite: only if the token is valid, unexpired,
  // unused, AND was issued for this exact email — an invite can't be
  // redeemed by a different address than the one it was sent to.
  if (inviteToken) {
    const tokenHash = hashToken(inviteToken);
    const invitation = await prisma.cohortInvitation.findUnique({
      where: { tokenHash },
      include: { cohort: true },
    });
    if (
      invitation &&
      !invitation.acceptedAt &&
      invitation.expiresAt > new Date() &&
      invitation.email.toLowerCase() === email.toLowerCase()
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
      await prisma.$transaction(async (tx: any) => {
        await tx.cohortInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });
        await tx.enrolment.upsert({
          where: {
            learnerId_courseId: { learnerId: user.id, courseId: invitation.cohort.courseId },
          },
          update: {},
          create: { learnerId: user.id, courseId: invitation.cohort.courseId },
        });
        await tx.cohortMember.upsert({
          where: { cohortId_learnerId: { cohortId: invitation.cohortId, learnerId: user.id } },
          update: {},
          create: { cohortId: invitation.cohortId, learnerId: user.id },
        });
      });
    }
    // An invalid/expired/mismatched token is silently ignored rather than
    // failing registration — the account is still created normally. The
    // invite was a bonus shortcut into a cohort, not a requirement.
  }

  const { raw, hash } = generateToken();
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      type: "EMAIL_VERIFY",
      expiresAt: new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000),
    },
  });
  const message = buildVerificationEmail(user.fullName, raw);
  await sendEmail({ ...message, to: user.email });

  await createSession({ userId: user.id, role: user.role });

  return NextResponse.json({ id: user.id, fullName: user.fullName, role: user.role });
}
