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

/** Who may update a course's content (details and duration, modules,
 * lessons and media): everyone who can manage it, at any stage, plus
 * content reviewers once the course is published, so they can keep live
 * courses accurate. Deleting, publishing, quizzes, the project and grading
 * stay with canManageCourse. */
export function canUpdateCourseContent(
  session: SessionPayload,
  course: { instructorId: string; status: string },
): boolean {
  if (canManageCourse(session, course.instructorId)) return true;
  return session.role === "CONTENT_REVIEWER" && course.status === "PUBLISHED";
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
