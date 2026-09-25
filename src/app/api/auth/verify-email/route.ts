import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?verify=missing", request.url));
  }

  const tokenHash = hashToken(token);
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });

  if (
    !record ||
    record.type !== "EMAIL_VERIFY" ||
    record.usedAt ||
    record.expiresAt < new Date()
  ) {
    return NextResponse.redirect(new URL("/login?verify=invalid", request.url));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
  await prisma.$transaction(async (tx: any) => {
    await tx.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } });
    await tx.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  });

  return NextResponse.redirect(new URL("/account?verify=success", request.url));
}
