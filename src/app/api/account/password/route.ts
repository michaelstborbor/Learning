import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, getSession, hashPassword, revokeAllSessions, verifyPassword } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/profile";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

// Changes the signed-in user's password. Every other device is signed out;
// this one stays signed in with a fresh session.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const limit = await rateLimit(`password-change:${session.userId}`, { limit: 5, windowSeconds: 900 });
  if (!limit.allowed) return tooManyRequests(limit, "Too many attempts. Wait 15 minutes and try again.");

  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue?.message ?? "Invalid input.", field: issue?.path[0] ?? null }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Your current password is not right.", field: "currentPassword" }, { status: 400 });
  }
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "Choose a new password that is different from your current one.", field: "newPassword" },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await revokeAllSessions(user.id, tx);
    return tx.user.findUniqueOrThrow({ where: { id: user.id }, select: { role: true, sessionVersion: true } });
  });
  await createSession({ userId: user.id, role: updated.role, sessionVersion: updated.sessionVersion });

  return NextResponse.json({ ok: true });
}
