import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateToken } from "@/lib/tokens";
import { sendEmail, buildPasswordResetEmail } from "@/lib/notifications";
import { rateLimitOrNull } from "@/lib/rate-limit";

const RESET_EXPIRY_HOURS = 1;

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export async function POST(request: Request) {
  // Tighter than login: this endpoint can trigger an email send to a
  // third party's inbox, so it also guards against using this platform to
  // spam someone else's address, not just brute forcing.
  const limited = rateLimitOrNull(request, "forgot-password", { limit: 5, windowSeconds: 600 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = forgotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Same response whether or not the account exists — confirming an
  // email is/isn't registered to an unauthenticated caller is an account
  // enumeration risk (same discipline as login's error message).
  //
  // Timing note (found during the Stage F4 audit): the "user exists"
  // branch below does real work (token creation, an email API call) that
  // the "no such user" branch skips, which is a timing side-channel that
  // could theoretically leak whether an email is registered. generateToken()
  // is called unconditionally, below, specifically to keep the two paths'
  // cheap work identical; the remaining gap is the DB write + email send,
  // which is a reasonable, not perfect, mitigation — a fully constant-time
  // response would need an artificial delay calibrated to match real send
  // latency, which isn't worth the complexity at this stage. See
  // SECURITY.md.
  const { raw, hash } = generateToken();

  if (user) {
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        type: "PASSWORD_RESET",
        expiresAt: new Date(Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000),
      },
    });
    const message = buildPasswordResetEmail(user.fullName, raw);
    await sendEmail({ ...message, to: user.email });
  }

  return NextResponse.json({
    ok: true,
    message: "If that email has an account, a reset link is on its way.",
  });
}
