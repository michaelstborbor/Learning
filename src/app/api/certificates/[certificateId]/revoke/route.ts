import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PUBLISH_ROLES } from "@/lib/roles";

const revokeSchema = z.object({
  reason: z.string().trim().min(5, "Give a reason for the audit trail."),
});

// Deliberately the same role gate as publishing (PUBLISH_ROLES): admin
// only, not the course's own instructor — revocation is a platform-level
// trust decision (Rule 5), not a course-management one.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ certificateId: string }> },
) {
  const session = await requireRole(PUBLISH_ROLES);
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { certificateId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const certificate = await prisma.certificate.findUnique({ where: { id: certificateId } });
  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
  }
  if (certificate.status === "REVOKED") {
    return NextResponse.json({ error: "Already revoked." }, { status: 409 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
  const updated = await prisma.$transaction(async (tx: any) => {
    const result = await tx.certificate.update({
      where: { id: certificateId },
      data: { status: "REVOKED" },
    });
    await tx.certificateAuditLog.create({
      data: {
        certificateId,
        action: "REVOKED",
        performedById: session.userId,
        notes: parsed.data.reason,
      },
    });
    return result;
  });

  return NextResponse.json(updated);
}
