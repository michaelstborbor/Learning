# Architecture

Full rationale lives in `PHASE0_BLUEPRINT.md`. This file tracks the *current, actual*
state of the codebase as it exists right now, and is updated at the end of every
build stage — it should never describe functionality that doesn't exist yet.

## Shape

Modular monolith. One Next.js application handles both frontend and backend
(API routes), talking to a single PostgreSQL database via Prisma. No microservices.

## Current modules (as of Stage F6 — SEO, Deployment, Backups & Production Readiness — the final stage)

- **Design system** (Phase 2): colour/type tokens (`src/app/globals.css`), reusable
  UI components (`src/components/ui/`), live `/style-guide` route. See `DESIGN.md`.
- **`auth`** (Stage B, extended in F2): registration, login, logout, sessions,
  server-side RBAC helpers, email verification, and password reset. See the
  Authentication section below.
- **`courses` / `assessments` / `skills`** (Stage C, extended in F3 — the Core
  Learning Loop): course authoring, modules/lessons, enrolment, lesson-progress
  tracking, a knowledge quiz engine, a practical-project engine, instructor
  grading, the Skills Passport, and now a real Draft→Review→Approved→Published
  content workflow. See the Core Learning Loop and Content Review sections below.
- **`certificates`** (Stage D, rescoped from "Commerce & Credentials" — payments
  are deferred, so this stage is certification only): automatic issuance, public
  verification, admin-only audited revocation. See the Credentials section below.
- **`organizations`** (Stage E, extended in F2): organization profiles, cohorts (a
  grouping + attendance layer over the normal course Enrolment), an opportunity
  marketplace, applications, and real email invites for employees without an
  account. See the Organizations & Scale and Notifications sections below.
- **Admin dashboard** (Stage F1, extended in F3, F4): platform stats overview,
  user management (role changes, activation), an organizations overview,
  platform-wide learning-performance analytics, and now an audit log viewer.
  See the Administration and Analytics sections below.
- **`notifications`** (Stage F2): a provider-abstracted email service. See the
  Notifications section below.
- **`analytics` / search / recommendations** (Stage F3): course-level analytics
  on the instructor's course page, org-wide aggregate stats, a top-courses view
  for admins, real filtered search on courses and opportunities, and transparent
  rule-based course recommendations. See the Analytics, Search & Recommendations
  section below.
- **Security/privacy/accessibility/performance audit** (Stage F4): rate
  limiting on auth endpoints, an attendance data-integrity fix, a general
  admin audit trail, security headers, two corrected WCAG AA contrast
  failures, and a skip-to-content link — full findings in `SECURITY.md`.
- **Testing & seed data** (Stage F5): 51 executed, passing unit tests
  covering every safety-critical piece of logic (certificate issuance,
  quiz grading, permissions, rate limiting, tokens, validation); Playwright
  E2E specs covering every flow the brief names by name; realistic seed
  data (8 sample courses, every role, an org/cohort/opportunity). Full
  detail, including exactly what's executed vs. written-but-unverified, in
  `TESTING.md`.
- **SEO, deployment & production readiness** (Stage F6, the final stage):
  dynamic sitemap/robots.txt, per-page metadata and Open Graph tags, JSON-LD
  on course pages; concrete Render-based deployment instructions with a
  backup/disaster-recovery plan (`DEPLOYMENT.md`); the remaining required
  docs (`API.md`, `ADMIN_GUIDE.md`, `USER_GUIDE.md`, `CHANGELOG.md`); and an
  honest final audit against the brief's Section 60 delivery table
  (`PRODUCTION_READINESS.md`).
- **Public site**: home, course catalogue (now searchable/filterable), course
  detail with enrolment, about, contact, FAQs, terms, privacy, certificate
  verification, and a public opportunities listing (also searchable/filterable)
  /detail/apply flow — every public page now has real metadata, Open Graph
  tags, and a dynamic sitemap (Stage F6).

Not yet implemented: `payments`.

## Planned module boundaries (not yet built)

- `payments` — deferred (platform currently free/open-access); provider-abstracted
  interface will be added here when payments are introduced

## Authentication & authorization

Implemented (`src/lib/auth.ts`):

- Email/password registration and login, password hashing via bcrypt
- Sessions: a signed JWT (via `jose`) in an httpOnly, secure, SameSite=Lax cookie
- `getSession()` / `requireRole()` — the enforcement point for every protected
  page and action, always checked server-side
- `canManageCourse()` (`src/lib/permissions.ts`) — Rule 9 enforcement: instructors
  only manage courses they own; admins manage any course. Checked on every
  course-mutating route (modules, lessons, quiz, project), not just at the top level.
- Edge `proxy.ts` gives a redundant first-line redirect for `/account`, `/dashboard`,
  `/skills`, `/learn`, and `/instructor` — the real check always happens again on
  the page/route itself.
- New accounts always default to `LEARNER` — no self-selecting a privileged role
  at signup.
- **Email verification** (Stage F2): a hashed, expiring token
  (`VerificationToken`, type `EMAIL_VERIFY`) is created at registration and
  emailed via `src/lib/notifications`. Verifying doesn't block using the
  product — it's a banner + resend button on `/account`, not a gate — matching
  the common pattern of nagging rather than locking out.
- **Password reset** (Stage F2): `/forgot-password` → `/reset-password`, using a
  separate token type (`PASSWORD_RESET`, 1-hour expiry vs. 24 hours for
  verification). The forgot-password endpoint always returns the same generic
  response whether or not the email exists — same account-enumeration
  discipline as the login error message.

Not yet implemented: role-specific profile tables.

## Core Learning Loop (Stage C)

**Scope decisions, made explicit rather than silently assumed:**
- Only **Project** (practical, rubric-graded) is built — **Assignment** (the
  lighter-weight gradable entity from the original brief) is deferred. Can be
  added later without restructuring anything.
- Publishing was **Draft → Published, admin-only** through Stage F2 — **Stage F3
  replaced this with the real Draft → Under Review → Approved → Published →
  Archived workflow**, including an active Content Reviewer role. See the
  Content Review section below.
- One quiz and one project per course, not per-module. Matches the example course
  structure in `PHASE0_BLUEPRINT.md`; finer granularity can be added later.
- Course category/level are plain strings, not their own entities, until an admin-
  managed taxonomy is actually needed.
- Lessons are plain text/markdown. Video/file resources wait on object storage
  (see File storage, below) — no storage backend exists yet.
- Project submissions are a **link** (e.g. to a hosted doc/file), not an upload —
  same reason.

**The Rule 1/2 enforcement point, concretely:** a `LearnerSkill` only reaches
`DEMONSTRATED` inside the grading transaction in
`src/app/api/submissions/[submissionId]/grade/route.ts`, when a human grader
(instructor or admin) records a passing score. Watching every lesson, or even
submitting a project, only ever sets a skill to `IN_PROGRESS`. This is enforced in
one place, not scattered across the UI, so it can't quietly drift.

**Grading integrity:** quiz answers are graded entirely server-side
(`api/quiz/[quizId]/attempt`) against stored `isCorrect` flags — the client only
ever sends which option it picked. The learner-facing quiz fetch
(`api/quiz/[quizId]`) deliberately reshapes the response to strip `isCorrect`
before it ever reaches the browser, rather than trusting the frontend to hide it.

## Credentials (Stage D)

**Rescoping note:** the roadmap originally called this stage "Commerce &
Credentials." Per product decision, the platform launches free/open-access with
payments deferred indefinitely, so this stage delivered credentials only.

**Issuance is automatic, not admin-triggered.** `src/lib/certificates.ts` exports
`maybeIssueCertificate(learnerId, courseId)`, the single place a `Certificate` row
is ever created. It's called from three places — lesson completion reaching 100%,
a passing quiz attempt, a passing project grade — because any one of the three
could be the final piece of a course's criteria. A course only certifies once
100% lesson progress is reached AND (if the course has a quiz) a passed attempt
exists AND (if the course has a project) a passing graded submission exists.

**Revocation is the one manual, audited exception.** Only Platform/Super Admin can
revoke (`api/certificates/[certificateId]/revoke`), always requires a reason, and
always writes a `CertificateAuditLog` row — this is the Rule 5/6 enforcement point.
A revoked certificate is never silently re-issued by the automatic path re-firing.

**Verification is genuinely public.** `api/verify/[certificateNumber]` has no
session check by design — an employer with no EcoSkills Academy account has to be
able to check a certificate. It returns the true status even for a revoked
certificate (name, course, status: Revoked) rather than pretending it doesn't
exist, because a real verifier deserves an honest answer, not silence.

**Issuing body:** `Certificate.issuingPartner` is nullable and unset for now —
every certificate reads "EcoSkills Academy" as the sole issuer, per product
decision. A named partner institution can be added later without a migration.

## Organizations & Scale (Stage E)

**Scope decisions, made explicit:**
- One Organization per owning `User` for now — mirrors the Course-has-one-
  instructor pattern already established. A real multi-staff
  `OrganizationMember` join table is deferred until an organization actually
  needs more than one person managing it.
- The "request training" / partnership-contact workflow from the original brief
  (Section 58) is a separate, later phase — this stage has organizations
  directly create cohorts and enrol employees themselves instead.
- **Adding an employee to a cohort requires that person to already have an
  account, OR sends a real invite (Stage F2 resolved this).** If the email
  matches an existing user, they're added instantly. If not, a
  `CohortInvitation` is created and an email sent with a registration link;
  accepting it (registering with that link) both creates the account and joins
  the cohort in one step. See the Notifications section below.
- **A real gap, named rather than quietly left:** ~~there is still no admin UI
  anywhere for granting the Instructor or Organization role to a user~~ —
  **resolved in Stage F1**, see the Administration section below. This note is
  kept as a record that the gap was named honestly before it was fixed, not
  discovered later.

**A cohort is a layer on top of a normal Enrolment, not a parallel tracking
system.** Adding a `CohortMember` also creates (or reuses) a standard
`Enrolment` in the same transaction (`api/cohorts/[cohortId]/members`), so every
existing piece of machinery — lesson progress, quizzes, projects, certificate
issuance — just works for cohort members exactly as it does for any other
learner. The cohort dashboard (`/organization/cohorts/[cohortId]`) reads
progress from those same tables rather than maintaining its own copy.

**Rule 8 enforcement point:** `canManageOrganization()` in
`src/lib/permissions.ts` is checked on every organization-scoped route — cohort
creation, adding members, attendance, opportunities, and application status
changes — not just at the top level, the same discipline as `canManageCourse()`
for Rule 9.

**Opportunities are genuinely public to browse** (`/opportunities`,
`/opportunities/[id]`) — no login required to see what's posted, only to apply.

## Administration (Stage F1)

**Closes a named gap.** Since Stage C, granting the Instructor role (and since
Stage E, the Organization role) required direct database access — there was no
UI for it. `/admin/users` fixes that: any Platform or Super Admin can change a
user's role or activation status through a real screen.

**Two safety guards, enforced server-side in `api/admin/users/[userId]`, not just
hidden in the UI:**
- An admin can't modify their own account through this endpoint (prevents
  accidental self-lockout or confusing self-changes).
- Only a Super Admin can grant or revoke the Super Admin role itself — a Platform
  Admin changing a user to/from Super Admin is rejected, even if they try it
  directly against the API. This is the concrete guard against a lesser admin
  escalating anyone (including a second account of their own) to the top
  permission level.

**Not a new data model.** This stage adds one API route and three pages over the
existing `User`, `Organization`, `Course`, and `Certificate` tables — no schema
changes. The admin dashboard's stat counts are live queries, not a cached or
precomputed summary.

## Notifications (Stage F2)

**The abstraction boundary is real, not decorative.** `src/lib/notifications/resend-provider.ts`
is the only file in the codebase that knows Resend's API shape. Everything else —
registration, password reset, cohort invites — calls `sendEmail()` from
`src/lib/notifications/index.ts`. Swapping providers later means rewriting one
file and its `send()` method, not hunting down every call site.

**Fails gracefully, never fakes success.** When `RESEND_API_KEY` /
`EMAIL_FROM_ADDRESS` aren't set — the default state in local dev, and always
true in the sandbox this was built in (no network path to `api.resend.com`
regardless) — `ResendProvider.send()` logs a clear console warning and returns
`null` rather than throwing or silently pretending an email went out. Every
call site treats email as best-effort: a failed or skipped send never blocks
registration, password reset, or cohort invitations from completing.

**Two separate token types, two separate lifetimes.** `VerificationToken` is
shared between email verification (`EMAIL_VERIFY`, 24-hour expiry) and password
reset (`PASSWORD_RESET`, 1-hour expiry) — same table, a `type` column
distinguishes them, and each is checked against its own type when redeemed
(a verify link can't be used to reset a password, or vice versa). Tokens are
stored **hashed** (sha256, see `src/lib/tokens.ts`) — the same discipline as a
password — so a database read alone can never produce something usable; only
the raw value in the emailed link can.

**Email verification nags, it doesn't gate.** A new account can use the product
immediately; `/account` shows a dismissable-by-action (not dismissable-by-
ignoring) banner with a resend button until the address is confirmed. This was
a deliberate choice, not an oversight — blocking product use on email
confirmation is a common but often unnecessary friction point, and nothing
currently in the product actually requires a confirmed email to function
safely.

**Cohort invitations close the Stage E gap for real.** `CohortInvitation` rows
are created only when `api/cohorts/[cohortId]/members` doesn't find a matching
user; accepting one (via the link, at registration) atomically creates the
account, marks the invitation accepted, and creates both the `Enrolment` and
`CohortMember` in one transaction — see `api/auth/register/route.ts`. An
invalid, expired, or email-mismatched invite token is silently ignored rather
than failing registration: the invite was a bonus shortcut into a cohort, never
a requirement to create an account.

## Content Review (Stage F3)

**Replaces the Draft→Published-only flow from Stages C–F2 with the real
workflow from `PHASE0_BLUEPRINT.md` Section 55.** `CourseStatus` now has five
values: `DRAFT → UNDER_REVIEW → APPROVED → PUBLISHED → ARCHIVED`. The
transitions are enforced as an actual state machine, not accepted as any
arbitrary status:

- Instructor (or admin) submits their own **Draft** for review
  (`api/courses/[courseId]/submit-review`) — owner-checked via
  `canManageCourse()`, same as every other course-mutating action.
- A Content Reviewer (a distinct role from Admin — `REVIEWER_ROLES` in
  `src/lib/roles.ts`) either approves (`APPROVED`) or requests changes, which
  writes a required `reviewFeedback` note and sends the course back to
  `DRAFT` (`api/courses/[courseId]/review`). The instructor sees that
  feedback on their course management page until they resubmit.
- Only an Admin can publish (`APPROVED → PUBLISHED`) or archive
  (`PUBLISHED → ARCHIVED`) — `api/courses/[courseId]/publish` now rejects any
  other transition outright, closing off the possibility of skipping review
  by calling the endpoint directly.

The review queue (`/review`) shows a reviewer the full course content —
description, module/lesson counts, whether a quiz and project exist — before
they decide, and flags a structural problem plainly: a submitted course with
neither a quiz nor a project can't certify anyone, shown as a visible warning
rather than silently allowed through.

## Analytics, Search & Recommendations (Stage F3)

**Analytics are live queries, not a precomputed or cached summary**, at every
level:
- **Instructor** (`/instructor/courses/[courseId]`): enrolment count,
  completion rate, quiz pass rate, average graded project score, certificates
  issued — all computed from the same `Enrolment`/`QuizAttempt`/
  `ProjectSubmission`/`Certificate` tables the learner-facing pages use.
- **Admin** (`/admin`): the above aggregated platform-wide, plus a
  most-popular-courses list (by enrolment count) and a live count of courses
  awaiting review.
- **Organization** (`/organization`): aggregated across every cohort the org
  runs — unique employees trained, completion rate, certificates issued —
  built from the same per-member `(learnerId, courseId)` pairs the individual
  cohort dashboard already reads.

**Search is plain HTML `<form method="GET">`, not client-side JavaScript.**
Course and opportunity filtering (`/courses`, `/opportunities`) submit as a
normal page navigation with query parameters, and the server renders the
filtered result directly. This was a deliberate choice, not a shortcut: zero
client JS for a feature every visitor might use fits the platform's
low-bandwidth-first principle better than a JS-driven filter UI would.

**Recommendations are transparent rules, not a model.** `src/lib/recommendations.ts`
implements exactly what `PHASE0_BLUEPRINT.md` asks for at MVP stage: if a
learner has enrolments, recommend other published courses in the same
category(ies); otherwise, show the most recently published courses. The
reason shown to the learner ("Because you're learning X") is the literal rule
that fired, not a generated explanation — there is no AI/ML in this path.

## Security, Privacy, Accessibility & Performance (Stage F4)

**Full findings, fixes, and honestly-flagged gaps live in `SECURITY.md`** —
this section is a pointer, not a duplicate. In brief: this was a real audit
(contrast ratios actually calculated, IDOR checks actually re-walked across
every route), not a checklist that asserted things were fine. It found and
fixed two genuine issues — a WCAG AA contrast failure on every primary
button, and a cohort attendance endpoint that didn't verify learner IDs
belonged to the cohort it was writing records for — plus added rate limiting,
a general admin audit trail (`AdminAuditLog`, closing a real Rule 6 gap that
existed since Stage F1), and security response headers. It also names what
it did *not* fix (account deletion, data export) rather than leaving them
undiscussed.

## Database

See `DATABASE.md`. Now contains `User` (extended in F2 with `emailVerified`), the
full Stage C entity set (`Course`, `Module`, `Lesson`, `Enrolment`,
`LessonProgress`, `Quiz`, `Question`, `Answer`, `QuizAttempt`, `Project`,
`ProjectSubmission`, `Skill`, `LearnerSkill`), the Stage D entity set
(`Certificate`, `CertificateAuditLog`), the Stage E entity set (`Organization`,
`Cohort`, `CohortMember`, `AttendanceRecord`, `Opportunity`, `Application`), and
the Stage F2 entity set (`VerificationToken`, `CohortInvitation`). Stage F3
added no new tables — it extended `Course` with a `reviewFeedback` field and
widened `CourseStatus` from two values to five. Stage F4 added `AdminAuditLog`
(the general admin action trail — see the section above and `SECURITY.md`).

**Known sandbox limitation (unchanged since Stage B, read before assuming
something is broken):** this codebase was authored in a build environment whose
network access does not reach `binaries.prisma.sh`, the host Prisma's CLI
downloads its query engine from. `npx prisma generate` cannot run here, so
`@prisma/client` ships as an untyped stub (`PrismaClient: any`) rather than the
real generated client. This is a network restriction of the *authoring* sandbox,
not a code defect — on any normal machine or CI/deploy pipeline, `npm install` +
`npx prisma generate` works exactly as on any standard Prisma project.

Two concrete, documented consequences of this, present since Stage C and
unchanged in Stage E:
1. `src/lib/db.ts` instantiates the Prisma client lazily (via a `Proxy`) rather
   than at module load, so `next build`'s static-analysis pass doesn't crash
   trying to construct a client with no real engine.
2. A number of query-result callback parameters (e.g. `.map((course: any) => ...)`)
   are explicitly typed `any` with an inline comment pointing back to this section,
   because the stub client returns `any` for every query and TypeScript's strict
   mode otherwise flags the resulting implicit `any`. These annotations become
   redundant (but harmless) the moment a real client is generated — they are not
   masking a logic bug, just naming an already-`any` value explicitly so strict
   mode is satisfied.

Verification actually performed in the sandbox: `npm run lint` (clean), full
`npm run build` (clean, all 75 routes compile). **Actual database behavior —
does registration really create a row, does grading really promote a skill,
does adding a cohort member really create an enrolment — has not been
runtime-tested against a real Postgres instance**, and should be manually
verified end-to-end the first time this runs somewhere with a real database
connection.

## File storage

Not yet implemented. Lessons are plain text and project submissions are links
for exactly this reason — see Core Learning Loop scope notes above.

## Payments

Deferred. The platform launches free/open-access. When payments are introduced,
they will sit behind a provider-abstracted interface so the core application never
depends on a specific provider's API directly, and payment status will only ever be
updated via a server-verified provider callback — never a frontend claim of success.
