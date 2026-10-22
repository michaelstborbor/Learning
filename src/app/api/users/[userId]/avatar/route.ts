import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { readObject } from "@/lib/storage";
import { imageType } from "@/lib/image-type";

// A user's profile photo, for people signed in to the platform. The URL
// carries ?v=<upload time>, so a new photo gets a new URL.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { userId } = await params;
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { avatarKey: true } });
  if (!profile?.avatarKey) return NextResponse.json({ error: "No photo." }, { status: 404 });

  const bytes = await readObject(profile.avatarKey);
  const type = bytes && imageType(bytes);
  if (!bytes || !type) return NextResponse.json({ error: "No photo." }, { status: 404 });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(bytes.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
