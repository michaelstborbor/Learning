import type { SessionPayload } from "@/lib/auth";

/** Rule 9 (PHASE0_BLUEPRINT.md): instructors only manage courses assigned
 * to them. Admins can manage any course. Call this before any
 * course-mutating action, not just the top-level route check. */
export function canManageCourse(
  session: SessionPayload,
  instructorId: string,
): boolean {
  if (session.role === "PLATFORM_ADMIN" || session.role === "SUPER_ADMIN") {
    return true;
  }
  return session.userId === instructorId;
}

/** Rule 8 (PHASE0_BLUEPRINT.md): "Organizations should only see their own
 * employees and training data." Admins can see any organization's data.
 * Call this before any organization-scoped read or write, not just at the
 * top level. */
export function canManageOrganization(
  session: SessionPayload,
  organizationOwnerId: string,
): boolean {
  if (session.role === "PLATFORM_ADMIN" || session.role === "SUPER_ADMIN") {
    return true;
  }
  return session.userId === organizationOwnerId;
}
