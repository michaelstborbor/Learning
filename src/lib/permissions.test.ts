import { describe, it, expect } from "vitest";
import { canManageCourse, canManageOrganization, canUpdateCourseContent } from "./permissions";
import type { SessionPayload } from "@/lib/auth";

function session(userId: string, role: SessionPayload["role"]): SessionPayload {
  return { userId, role };
}

describe("canManageCourse (Rule 9)", () => {
  it("allows the owning instructor", () => {
    expect(canManageCourse(session("instructor-1", "INSTRUCTOR"), "instructor-1")).toBe(true);
  });

  it("denies a different instructor", () => {
    expect(canManageCourse(session("instructor-2", "INSTRUCTOR"), "instructor-1")).toBe(false);
  });

  it("allows a Platform Admin regardless of ownership", () => {
    expect(canManageCourse(session("admin-1", "PLATFORM_ADMIN"), "instructor-1")).toBe(true);
  });

  it("allows a Super Admin regardless of ownership", () => {
    expect(canManageCourse(session("admin-1", "SUPER_ADMIN"), "instructor-1")).toBe(true);
  });

  it("denies a learner with no relationship to the course", () => {
    // canManageCourse is purely an ownership check, not a role check —
    // role gating (only instructors/admins can author at all) happens
    // separately via requireRole() at the route level. This test confirms
    // a learner who is NOT the course's instructor is denied, which is
    // the actual scenario that matters.
    expect(canManageCourse(session("learner-1", "LEARNER"), "instructor-1")).toBe(false);
  });

  it("denies a Content Reviewer (reviewing is not managing)", () => {
    expect(canManageCourse(session("reviewer-1", "CONTENT_REVIEWER"), "instructor-1")).toBe(false);
  });
});

describe("canUpdateCourseContent", () => {
  const published = { instructorId: "instructor-1", status: "PUBLISHED" };
  const draft = { instructorId: "instructor-1", status: "DRAFT" };

  it("allows the owning instructor and admins at any stage", () => {
    for (const course of [published, draft]) {
      expect(canUpdateCourseContent(session("instructor-1", "INSTRUCTOR"), course)).toBe(true);
      expect(canUpdateCourseContent(session("admin-1", "PLATFORM_ADMIN"), course)).toBe(true);
      expect(canUpdateCourseContent(session("admin-1", "SUPER_ADMIN"), course)).toBe(true);
    }
  });

  it("allows a Content Reviewer only once the course is published", () => {
    expect(canUpdateCourseContent(session("reviewer-1", "CONTENT_REVIEWER"), published)).toBe(true);
    expect(canUpdateCourseContent(session("reviewer-1", "CONTENT_REVIEWER"), draft)).toBe(false);
    expect(
      canUpdateCourseContent(session("reviewer-1", "CONTENT_REVIEWER"), { ...draft, status: "UNDER_REVIEW" }),
    ).toBe(false);
  });

  it("denies other instructors, learners and organizations", () => {
    expect(canUpdateCourseContent(session("instructor-2", "INSTRUCTOR"), published)).toBe(false);
    expect(canUpdateCourseContent(session("learner-1", "LEARNER"), published)).toBe(false);
    expect(canUpdateCourseContent(session("org-1", "ORGANIZATION"), published)).toBe(false);
  });
});

describe("canManageOrganization (Rule 8)", () => {
  it("allows the owning organization user", () => {
    expect(canManageOrganization(session("org-1", "ORGANIZATION"), "org-1")).toBe(true);
  });

  it("denies a different organization", () => {
    expect(canManageOrganization(session("org-2", "ORGANIZATION"), "org-1")).toBe(false);
  });

  it("allows a Platform Admin regardless of ownership", () => {
    expect(canManageOrganization(session("admin-1", "PLATFORM_ADMIN"), "org-1")).toBe(true);
  });

  it("allows a Super Admin regardless of ownership", () => {
    expect(canManageOrganization(session("admin-1", "SUPER_ADMIN"), "org-1")).toBe(true);
  });

  it("denies an instructor (unrelated role) from managing an org they don't own", () => {
    expect(canManageOrganization(session("instructor-1", "INSTRUCTOR"), "org-1")).toBe(false);
  });
});
