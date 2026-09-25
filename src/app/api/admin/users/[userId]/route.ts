import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PUBLISH_ROLES } from "@/lib/roles";
import { writeAuditLog } from "@/lib/audit-log";

const ALL_ROLES = [
  "SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "INSTRUCTOR",
  "CONTENT_REVIEWER",
  "ORGANIZATION",
  "MENTOR",
  "LEARNER",
  "PARTNER_CENTRE",
] as const;

const updateUserSchema = z.object({
  role: z.enum(ALL_ROLES).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireRole(PUBLISH_ROLES);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { userId } = await params;

  // Safety guard: an admin can't modify their own account through this
  // endpoint — prevents accidental self-lockout (deactivating yourself) or
  // confusing self-role-changes. Use a different admin account if a change
  // to your own account is genuinely needed.
  if (userId === session.userId) {
    return NextResponse.json(
      { error: "You can't modify your own account here." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Safety guard: only a Super Admin can grant or revoke the Super Admin
  // role — a Platform Admin could otherwise escalate anyone (including
  // themselves via a second account) to the top permission level.
  const touchesSuperAdmin =
    targetUser.role === "SUPER_ADMIN" || parsed.data.role === "SUPER_ADMIN";
  if (touchesSuperAdmin && session.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only a Super Admin can grant or change the Super Admin role." },
      { status: 403 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
  });

  await writeAuditLog({
    actorId: session.userId,
    action: "USER_UPDATED",
    targetType: "User",
    targetId: userId,
    notes: JSON.stringify(parsed.data),
  });

  return NextResponse.json({
    id: updated.id,
    fullName: updated.fullName,
    role: updated.role,
    isActive: updated.isActive,
  });
}
