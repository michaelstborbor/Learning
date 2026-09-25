# Database

PostgreSQL, managed via Prisma ORM. Schema source of truth: `prisma/schema.prisma`.

## Current state (as of Stage F4)

**Identity:** `User` — id, email, password hash, full name, role (enum), active
flag, `emailVerified` (nullable timestamp, added in F2), timestamps.

**Core Learning Loop (Stage C, extended in F3):**
- `Course`, `Module`, `Lesson` — content structure. Course category/level are plain
  strings for now; lessons are plain text (no video/file resources yet — no object
  storage exists). `Course.status` is now a five-value workflow (`DRAFT` →
  `UNDER_REVIEW` → `APPROVED` → `PUBLISHED` → `ARCHIVED`, widened in F3 from
  just `DRAFT`/`PUBLISHED`), and `Course.reviewFeedback` (added in F3) holds a
  reviewer's notes when sending a course back to `DRAFT` — see
  `ARCHITECTURE.md`'s Content Review section.
- `Enrolment`, `LessonProgress` — a learner's enrolment and per-lesson completion.
  `Enrolment.progressPercent` is recomputed from source-of-truth counts on every
  lesson completion, not incremented, so it can't drift if lessons are added later.
- `Quiz`, `Question`, `Answer`, `QuizAttempt` — the knowledge-check engine.
  Single-correct-answer multiple choice at this stage. One quiz per course.
- `Project`, `ProjectSubmission` — the practical, human-graded engine that actually
  proves competency (see Rule 1/2 in `PHASE0_BLUEPRINT.md`). One project per course,
  optionally linked to one `Skill`.
- `Skill`, `LearnerSkill` — the Skills Passport. A `LearnerSkill` row is created or
  promoted only by server-side code (submission → `IN_PROGRESS`, passing grade →
  `DEMONSTRATED`), never asserted directly by a learner.

**Credentials (Stage D, rescoped from "Commerce & Credentials" — payments are
deferred):**
- `Certificate` — id, unique `certificateNumber`, learner, course, competency
  statement, nullable `issuingPartner` (unset for now — EcoSkills Academy is the
  sole issuer), status (`ACTIVE`/`REVOKED`), issued timestamp. Created only by
  `maybeIssueCertificate()` in `src/lib/certificates.ts` — see `ARCHITECTURE.md`'s
  Credentials section for exactly when that fires.
- `CertificateAuditLog` — action, nullable performer (null = issued automatically
  by the system, not a person), notes, timestamp. Every issuance and revocation
  writes a row here — this is the Rule 6 audit-trail requirement in practice.

**Organizations & Scale (Stage E):**
- `Organization` — one per owning `User` (role `ORGANIZATION`) for now. Name,
  description, website.
- `Cohort` — course, optional organization, title, start/end date, location,
  delivery mode (`ONLINE`/`OFFLINE`/`HYBRID`).
- `CohortMember` — links a learner to a cohort. Creating one also creates (or
  reuses) a standard `Enrolment` in the same transaction — see `ARCHITECTURE.md`'s
  Organizations & Scale section.
- `AttendanceRecord` — cohort, learner, session date, present/absent. Unique per
  cohort+learner+date so re-marking a date updates rather than duplicates.
- `Opportunity` — organization, type (internship/job/apprenticeship/volunteer/
  project/mentorship), description, eligibility criteria, location, open/closed
  status.
- `Application` — links a learner to an opportunity, with a status
  (Applied/Shortlisted/Interview/Selected/Rejected) an organization moves through.

**Notifications (Stage F2):**
- `VerificationToken` — user, hashed token (sha256, never stored raw), type
  (`EMAIL_VERIFY` / `PASSWORD_RESET`), expiry, nullable `usedAt`. One table
  shared by both flows, distinguished by `type`, each checked against its own
  type when redeemed. See `ARCHITECTURE.md`'s Notifications section.
- `CohortInvitation` — cohort, invited email, hashed token, expiry, nullable
  `acceptedAt`. Created when an org adds a cohort member whose email doesn't
  match an existing account; accepted atomically at registration time.

**Security audit (Stage F4):**
- `AdminAuditLog` — actor, action, target type/id, optional notes, timestamp.
  A general-purpose trail for admin/reviewer actions (role changes, account
  activation, course publish/archive, review decisions) — closes a Rule 6 gap
  found during the audit. Certificates keep their own dedicated
  `CertificateAuditLog` (Stage D) rather than sharing this table. See
  `SECURITY.md`.

Role-specific profile tables (`LearnerProfile`, `InstructorProfile`,
`OrganizationMember` for multi-staff orgs, etc.), `CourseCategory`/`CourseLevel`
as real entities, and `Assignment` (as distinct from `Project`) are all
deliberately not yet built — see `ARCHITECTURE.md` for the scope reasoning
behind each.

**Note:** real database calls have not been runtime-tested in the environment this
was built in — see the "Known sandbox limitation" note in `ARCHITECTURE.md`, and
verify the full flow (register → verify email → submit a course for review →
approve it as a reviewer → publish it as admin → enrol → complete lesson → take
quiz → submit project → get graded → see Skills Passport entry → see Certificate
issued → verify it publicly → revoke it as admin → create an organization → run
a cohort → invite an employee by email → post and apply to an opportunity →
search/filter courses and opportunities → see recommendations appear → reset a
forgotten password) against a real database the first time this deploys. Real
email delivery additionally needs `RESEND_API_KEY` set — without it, emails are
skipped with a logged warning rather than sent (see `ARCHITECTURE.md`'s
Notifications section).

## Planned entity groups (not yet in the schema)

See `PHASE0_BLUEPRINT.md` Section 3 for the full conceptual model. Entities are
added incrementally, one module at a time, as each build stage is reached.

- Commerce: Order, Payment, Subscription, Coupon (deferred — added when payments
  are introduced)
- Platform: Notification, Review, AuditLog

## Migrations

Every schema change goes through `npx prisma migrate dev` (local) and
`npx prisma migrate deploy` (production) — never manual schema edits against a live
database.

## Local setup

```bash
cp .env.example .env   # set a real DATABASE_URL
npx prisma generate
npx prisma migrate dev --name init
```
