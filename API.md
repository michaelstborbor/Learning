# API Reference

Internal REST API used by EcoSkills Academy's own frontend — not currently
published as a public/third-party API. Documented here for maintainability
and so a future developer (or AI coding agent) doesn't have to reverse-engineer
the request shapes from route source. All routes are under `/api/`.

**Conventions across every route:**
- Request/response bodies are JSON.
- Every route enforces authorization server-side — see `ARCHITECTURE.md`'s
  Authentication section and `src/lib/permissions.ts`. "Auth" below states
  who can call it; the actual enforcement is in the route's own code, not
  just this table.
- Validation errors return `{ "error": "<message>" }` with a 4xx status —
  every input-taking route validates with Zod (`src/lib/validation.ts` and
  inline schemas per route).
- No route returns raw server errors or stack traces — see `SECURITY.md`.

## Authentication

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create an account (always `LEARNER` role). Rate-limited. Accepts an optional `inviteToken` to auto-join a cohort. |
| POST | `/api/auth/login` | Public | Log in, sets the session cookie. Rate-limited. |
| POST | `/api/auth/logout` | Session | Clears the session cookie. |
| GET | `/api/auth/verify-email?token=` | Public (token-gated) | Confirms an email verification token, redirects to `/account`. |
| POST | `/api/auth/resend-verification` | Session | Sends a new verification email. Rate-limited per user. |
| POST | `/api/auth/forgot-password` | Public | Requests a password reset email. Same response whether or not the account exists. Rate-limited. |
| POST | `/api/auth/reset-password` | Public (token-gated) | Completes a password reset with a valid token. |

## Courses

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/courses` | Public | List published courses. |
| POST | `/api/courses` | Instructor/Admin | Create a new draft course. |
| GET | `/api/courses/[courseId]` | Public if published, else owner/admin | Full course detail including modules/quiz/project. |
| PATCH | `/api/courses/[courseId]` | Owner/Admin | Update course fields (title, description, etc.). |
| POST | `/api/courses/[courseId]/submit-review` | Owner/Admin | Draft → Under Review. |
| POST | `/api/courses/[courseId]/review` | Content Reviewer/Admin | Approve (→ Approved) or request changes (→ Draft, with required feedback). |
| POST | `/api/courses/[courseId]/publish` | Admin only | Approved → Published, or Published → Archived. Rejects any other transition. |
| POST | `/api/courses/[courseId]/enrol` | Session (learner) | Enrol in a published course. |
| POST | `/api/courses/[courseId]/modules` | Owner/Admin | Add a module. |
| POST | `/api/modules/[moduleId]/lessons` | Owner/Admin (via parent course) | Add a lesson to a module. |
| POST | `/api/lessons/[lessonId]/complete` | Session (must be enrolled) | Marks a lesson complete, recomputes enrolment progress, may trigger certificate issuance. |

## Assessments

| Method | Path | Auth | Purpose |
|---|---|---|---|
| PUT | `/api/courses/[courseId]/quiz` | Owner/Admin | Create/replace the course's quiz (full replace-on-save). |
| GET | `/api/quiz/[quizId]` | Session (must be enrolled) | Learner-safe quiz fetch — **never** includes `isCorrect`. |
| POST | `/api/quiz/[quizId]/attempt` | Session (must be enrolled) | Submit answers; graded entirely server-side via `gradeQuiz()`. May trigger certificate issuance on a pass. |
| PUT | `/api/courses/[courseId]/project` | Owner/Admin | Create/update the course's practical project. |
| POST | `/api/projects/[projectId]/submit` | Session (must be enrolled) | Submit a project (a link, not a file — no object storage yet). Sets the linked skill to `IN_PROGRESS`. |
| POST | `/api/submissions/[submissionId]/grade` | Owner/Admin (via course) | Grade a submission. A passing score (≥70) promotes the skill to `DEMONSTRATED` and may trigger certificate issuance. |

## Certificates

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/verify/[certificateNumber]` | **Public, no auth** | Certificate verification lookup. Returns true status even for a revoked certificate. |
| POST | `/api/certificates/[certificateId]/revoke` | Admin only | Revoke an active certificate; requires a reason; writes `CertificateAuditLog`. |

*(There is no "issue certificate" endpoint — issuance is automatic, never
API-triggered. See `src/lib/certificates.ts` and `ARCHITECTURE.md`'s
Credentials section.)*

## Organizations, Cohorts & Opportunities

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/organizations` | Organization/Admin | Create an organization profile (one per owning user). |
| POST | `/api/organizations/[organizationId]/cohorts` | Org owner/Admin | Create a cohort for a published course. |
| POST | `/api/cohorts/[cohortId]/members` | Org owner/Admin | Add a member by email — instant if they have an account, otherwise sends a real invite email. Validates against real cohort membership before any attendance write (see `SECURITY.md`). |
| POST | `/api/cohorts/[cohortId]/attendance` | Org owner/Admin | Record attendance for a session date. Rejects any learner id not actually in the cohort. |
| POST | `/api/organizations/[organizationId]/opportunities` | Org owner/Admin | Post an opportunity. |
| POST | `/api/opportunities/[opportunityId]/apply` | Session (learner) | Apply to an open opportunity. |
| POST | `/api/applications/[applicationId]/status` | Org owner/Admin (via opportunity) | Move an application through its status pipeline. |

## Administration

| Method | Path | Auth | Purpose |
|---|---|---|---|
| PATCH | `/api/admin/users/[userId]` | Admin only | Change a user's role and/or active status. Can't modify your own account; only Super Admin can touch the Super Admin role. Writes `AdminAuditLog`. |

## What's intentionally not here

- No `DELETE` endpoints exist anywhere — every "removal" in this platform is
  a status change (archive, revoke, deactivate), not a hard delete, so there's
  an audit trail instead of silently-gone data.
- No payment endpoints — deferred (see `PHASE0_BLUEPRINT.md`).
- No file-upload endpoints — no object storage exists yet (see
  `ARCHITECTURE.md`).
