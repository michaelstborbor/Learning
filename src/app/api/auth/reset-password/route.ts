import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { hashPassword, revokeAllSessions } from "@/lib/auth";
import { rateLimitOrNull } from "@/lib/rate-limit";
import { rejectBots } from "@/lib/bot-check";
import { passwordSchema } from "@/lib/validation";

const resetSchema = z.object({
  token: z.string().min(1, "Missing token.").max(200),
  password: passwordSchema,
});

export async function POST(request: Request) {
  const limited = await rateLimitOrNull(request, "reset-password", { limit: 10, windowSeconds: 600 });
  if (limited) return limited;
  const bot = await rejectBots();
  if (bot) return bot;

  const body = await request.json().catch(() => null);
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });

  if (
    !record ||
    record.type !== "PASSWORD_RESET" ||
    record.usedAt ||
    record.expiresAt < new Date()
  ) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
  await prisma.$transaction(async (tx: any) => {
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    // Whoever knew the old password is signed out everywhere.
    await revokeAllSessions(record.userId, tx);
    await tx.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  });

  return NextResponse.json({ ok: true });
}
