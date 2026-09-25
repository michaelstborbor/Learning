import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateToken } from "@/lib/tokens";
import { sendEmail, buildVerificationEmail } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";

const VERIFICATION_EXPIRY_HOURS = 24;

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  // Keyed by user id rather than IP — this route is already
  // authenticated, so the account itself is the more precise identity to
  // rate-limit, and it means the limit follows the account even if the
  // request comes from a different network.
  const limit = checkRateLimit(`resend-verification:${session.userId}`, {
    limit: 3,
    windowSeconds: 600,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  if (user.emailVerified) {
    return NextResponse.json({ error: "Already verified." }, { status: 409 });
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

  return NextResponse.json({ ok: true });
}
