import "server-only";
import { prisma } from "@/lib/db";

/** Rule 6 (PHASE0_BLUEPRINT.md): "Every important administrative action
 * should have an audit trail." Call this after any admin/reviewer action
 * that changes something consequential — role changes, activation
 * changes, course status changes. Deliberately fire-and-forget in spirit
 * (awaited, but callers shouldn't fail the whole request if this write
 * itself has a problem) — the primary action succeeding matters more than
 * the log entry. */
export async function writeAuditLog(entry: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  notes?: string;
}): Promise<void> {
  try {
    await prisma.adminAuditLog.create({ data: entry });
  } catch (error) {
    console.error("[audit-log] Failed to write audit entry:", error);
  }
}
