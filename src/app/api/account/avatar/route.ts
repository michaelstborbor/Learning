import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { deleteStored, putObject } from "@/lib/storage";
import { IMAGE_EXTENSION, imageType } from "@/lib/image-type";
import { avatarUrl } from "@/lib/profile";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

// The signed-in user's profile photo. The browser crops it to a 512px
// square WebP first (see src/lib/avatar-image.ts), so it is small.
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const limit = await rateLimit(`avatar-upload:${session.userId}`, { limit: 20, windowSeconds: 3600 });
  if (!limit.allowed) return tooManyRequests(limit);

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length === 0) return NextResponse.json({ error: "No photo received." }, { status: 400 });
  if (bytes.length > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: "Your photo must be smaller than 2 MB." }, { status: 413 });
  }
  const type = imageType(bytes);
  if (!type) return NextResponse.json({ error: "Use a JPG, PNG or WebP photo." }, { status: 400 });

  const previous = await prisma.profile.findUnique({ where: { userId: session.userId }, select: { avatarKey: true } });
  const key = `avatars/${session.userId}/${randomBytes(9).toString("base64url")}.${IMAGE_EXTENSION[type]}`;
  await putObject(key, bytes, type);
  const now = new Date();
  await prisma.profile.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId, avatarKey: key, avatarUpdatedAt: now },
    update: { avatarKey: key, avatarUpdatedAt: now },
  });
  if (previous?.avatarKey) await deleteStored(previous.avatarKey).catch(() => {});

  return NextResponse.json({ avatarUrl: avatarUrl(session.userId, now) });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const profile = await prisma.profile.findUnique({ where: { userId: session.userId }, select: { avatarKey: true } });
  if (profile?.avatarKey) {
    await prisma.profile.update({
      where: { userId: session.userId },
      data: { avatarKey: null, avatarUpdatedAt: null },
    });
    await deleteStored(profile.avatarKey).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
