import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { profileSchema } from "@/lib/profile";
import { unprintableNameCharacters } from "@/lib/certificate-fonts";
import { writeAuditLog } from "@/lib/audit-log";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

// Saves the signed-in user's profile. The full name is stored exactly as
// typed (trimmed at the ends only) because certificates print it word for
// word.
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const limit = await rateLimit(`profile-save:${session.userId}`, { limit: 30, windowSeconds: 3600 });
  if (!limit.allowed) return tooManyRequests(limit);

  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Invalid input.", field: issue?.path[0] ?? null },
      { status: 400 },
    );
  }
  const { fullName, username, phone, location, bio } = parsed.data;

  const unprintable = await unprintableNameCharacters(fullName);
  if (unprintable.length > 0) {
    return NextResponse.json(
      {
        error: `Certificates can't print ${unprintable.map((ch) => `"${ch}"`).join(", ")} yet. Write your name without ${unprintable.length === 1 ? "it" : "them"}, or contact us.`,
        field: "fullName",
      },
      { status: 400 },
    );
  }

  const before = await prisma.user.findUnique({ where: { id: session.userId }, select: { fullName: true } });
  if (!before) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const details = {
    ...(username !== undefined && { username }),
    ...(phone !== undefined && { phone }),
    ...(location !== undefined && { location }),
    ...(bio !== undefined && { bio }),
  };
  try {
    await prisma.$transaction([
      prisma.user.update({ where: { id: session.userId }, data: { fullName } }),
      prisma.profile.upsert({
        where: { userId: session.userId },
        create: { userId: session.userId, ...details },
        update: details,
      }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "That username is taken. Try another.", field: "username" }, { status: 409 });
    }
    throw error;
  }

  // Certificates show the current full name, so keep a record of changes.
  if (before.fullName !== fullName) {
    await writeAuditLog({
      actorId: session.userId,
      action: "PROFILE_NAME_CHANGED",
      targetType: "User",
      targetId: session.userId,
      notes: `"${before.fullName}" → "${fullName}"`,
    });
  }

  return NextResponse.json({ ok: true, fullName, username: username ?? null });
}
