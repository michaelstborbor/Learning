import type { UserRole } from "@/lib/auth";

// Centralized so every route enforces the same boundary — Rule 7/8/9/10 in
// PHASE0_BLUEPRINT.md. If a permission boundary ever needs to change, it
// changes in exactly one place.
export const COURSE_AUTHOR_ROLES: UserRole[] = [
  "INSTRUCTOR",
  "PLATFORM_ADMIN",
  "SUPER_ADMIN",
];

export const PUBLISH_ROLES: UserRole[] = ["PLATFORM_ADMIN", "SUPER_ADMIN"];

export const GRADER_ROLES: UserRole[] = [
  "INSTRUCTOR",
  "PLATFORM_ADMIN",
  "SUPER_ADMIN",
];

export const ORGANIZATION_ROLES: UserRole[] = [
  "ORGANIZATION",
  "PLATFORM_ADMIN",
  "SUPER_ADMIN",
];

export const REVIEWER_ROLES: UserRole[] = [
  "CONTENT_REVIEWER",
  "PLATFORM_ADMIN",
  "SUPER_ADMIN",
];
