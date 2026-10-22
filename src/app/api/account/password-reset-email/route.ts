import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateToken } from "@/lib/tokens";
import { sendEmail, buildPasswordResetEmail } from "@/lib/notifications";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const RESET_EXPIRY_HOURS = 1;

// "Email me a reset link" on the profile page, for someone signed in who
// no longer knows their current password. Same link and expiry as the
// logged-out forgot-password page, and it shares that page's inbox limit.
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const limit = await rateLimit(`forgot-password-email:${user.email}`, { limit: 3, windowSeconds: 3600 });
  if (!limit.allowed) {
    return tooManyRequests(limit, "A reset link was sent recently. Check your inbox, or try again in an hour.");
  }

  const { raw, hash } = generateToken();
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      type: "PASSWORD_RESET",
      expiresAt: new Date(Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000),
    },
  });
  await sendEmail({ ...buildPasswordResetEmail(user.fullName, raw), to: user.email });

  return NextResponse.json({ ok: true, email: user.email });
}
