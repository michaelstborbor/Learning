# Testing

**Stage F5 deliverable.** This document distinguishes, precisely, between what
has actually been executed and verified in this build environment, and what
is written correctly but has not been run — the same honesty discipline as
every other part of this project (see `ARCHITECTURE.md`'s "Known sandbox
limitation").

## Summary

| Layer | Status | Where |
|---|---|---|
| Unit tests | **51 tests, executed, all passing** | `src/lib/*.test.ts` |
| Logic tests (mocked DB) | **Executed, all passing** (included above) | `src/lib/certificates.test.ts` |
| End-to-end specs | **Written, correct, not executed** | `e2e/*.spec.ts` |
| Seed data | **Written, correct, not executed** | `prisma/seed.ts` |

## Unit tests — genuinely run in this environment

Run with `npm test` (or `npm run test:watch` while developing). These require
no database — they exercise pure logic directly, which is exactly why they
could be executed here when almost nothing else database-adjacent could be.

- **`slugify.test.ts`** — URL-slug generation from course titles.
- **`tokens.test.ts`** — token generation/hashing for email verification,
  password reset, and cohort invites. Verifies the actual security property
  (64 hex characters of entropy, deterministic hashing, no collisions across
  calls), not just "it runs."
- **`permissions.test.ts`** — `canManageCourse()` (Rule 9) and
  `canManageOrganization()` (Rule 8), tested against every relevant role
  combination: owner, non-owner, Platform Admin, Super Admin, and an
  unrelated role.
- **`rate-limit.test.ts`** — the in-memory rate limiter, using Vitest's fake
  timers to verify it actually blocks after the configured limit *and*
  actually resets after the window passes, plus that separate keys don't
  interfere with each other.
- **`validation.test.ts`** — the Zod schemas behind registration and login,
  including the deliberate asymmetry that login does NOT enforce the
  8-character minimum (a policy change shouldn't retroactively lock out
  existing users).
- **`grading.test.ts`** — the actual quiz-grading rule (`gradeQuiz()`,
  extracted from `api/quiz/[quizId]/attempt` specifically so it could be
  unit-tested directly rather than only indirectly through the route).
  Covers 100%/0%/partial scoring, a missing answer counting as wrong rather
  than erroring, a client sending extra/bogus question IDs being ignored,
  the pass-mark boundary being inclusive, a zero-question quiz not dividing
  by zero, and — the subtle one — a submitted answer ID from a *different*
  question never accidentally matching as correct.
- **`certificates.test.ts`** — `maybeIssueCertificate()`, the single most
  safety-critical function in the codebase (the concrete Rule 1/2
  enforcement point), tested against a fully mocked Prisma client. Covers:
  never re-issuing an existing certificate, requiring 100% lesson progress,
  requiring a *passed* quiz attempt when the course has a quiz, requiring a
  *passing graded* project submission when the course has a project (the
  core case: completing lessons and even passing the quiz is never enough
  alone), issuing correctly when a course has neither assessment, always
  writing an audit-log entry alongside issuance, and retrying certificate-
  number generation on a collision rather than silently reusing one.

Two real bugs were caught and fixed *while writing these tests*, not before:
a broken conditional in the rate limiter's over-limit branch in
`src/lib/rate-limit.ts` (returned the wrong object due to a stray `&&`,
found the moment the "blocks after limit" test was run), and a flawed test
case in `permissions.test.ts` that was accidentally constructed so it passed
regardless of the real logic (it set the learner's own id as the course's
instructor id, making the ownership check trivially true instead of testing
denial). Both are the kind of thing that's easy to miss without actually
running the test and watching what it does.

## Logic extraction note

`gradeQuiz()` living in `src/lib/grading.ts` instead of inline in the route
handler is a direct consequence of wanting it unit-testable. This is a
pattern worth continuing: safety-critical business rules should live in pure,
testable functions that routes call, not be inlined where they can only be
exercised through a full HTTP request against a live database.

## End-to-end specs — written, not executed

Run with `npm run test:e2e` (after `npx playwright install` once, against a
real running instance with `prisma/seed.ts` applied). **These have not been
run in this build environment** — two independent blockers, both already
documented elsewhere in this project: no real database connection
(`ARCHITECTURE.md`), and no network path to download Playwright's browser
binaries from this sandbox. They are written correctly against Playwright's
real API and reference real page structure (labels, button text, routes) as
they actually exist in this codebase — not guessed at — but "written
correctly" and "verified passing" are different claims, and only the first
is true here.

Coverage, mapped to the flows your brief names explicitly (Phase 34):

- **`auth.spec.ts`** — Registration (including that it logs the user in
  immediately and shows the unverified-email banner), client-side password
  length validation, login with a wrong password showing a generic error
  (no account enumeration), logout actually revoking access, and
  forgot-password's identical response regardless of whether the account
  exists.
- **`learning-loop.spec.ts`** — Course browsing/search, enrolment, opening a
  lesson and marking it complete, taking the quiz (including asserting the
  raw page HTML never contains `isCorrect`, as a behavioral proxy for "the
  server never leaks answers to the client"), and submitting a practical
  project.
- **`certificates-and-permissions.spec.ts`** — Certificate verification (a
  real one, and a made-up one showing a clean not-found rather than an error
  page), every protected route redirecting an unauthenticated visitor to
  `/login`, a learner specifically denied access to admin and instructor
  areas, and an admin successfully reaching user management and the stats
  dashboard.
- **`organization-training.spec.ts`** — An organization viewing cohort
  progress, adding an employee with no account and getting a real invite
  (not an error), and viewing applicants on a posted opportunity.

Not covered (because the underlying feature doesn't exist yet, correctly, per
`ARCHITECTURE.md`): payments (deferred product decision).

## Seed data — written, not executed

`prisma/seed.ts`, run via `npx prisma db seed` (configured in `package.json`'s
`prisma.seed` field). Creates, all with fictional names — no real institutions
or endorsements, per the brief's explicit instruction:

- 8 users across every role (Super Admin, Platform Admin, Content Reviewer,
  2 Instructors, Organization, 3 Learners) — every account's password is
  `DemoPass123!`, printed to the console when the script runs.
- 5 skills.
- **8 sample courses**, matching your brief's own example list exactly
  (Excel for the Workplace, Advanced Excel, Monitoring and Evaluation
  Fundamentals, KoboToolbox for Data Collection, Data Visualization with
  Power BI, Professional Report Writing, Project Management Fundamentals, AI
  for Workplace Productivity) — deliberately in a mix of statuses (most
  `PUBLISHED`, one `UNDER_REVIEW`, two `DRAFT`) so the review workflow has
  something real to demonstrate, not just a uniform "everything's live" set.
  The fully-built courses include modules, lessons, a knowledge quiz, and a
  practical project with a linked skill.
- One learner with a completed course, an issued certificate, and a
  demonstrated skill — so the Skills Passport and certificate verification
  have real data to show immediately.
- One learner mid-progress on a course (40%) — so the platform doesn't only
  demonstrate the "finished" state.
- One organization, one cohort (with a third learner enrolled through it, at
  10% progress), and one posted internship opportunity.

**This has not been run against a real database in this build environment**
— same root cause as everywhere else (`ARCHITECTURE.md`). It is carefully
written and passes a full project type-check (`npx tsc --noEmit`, clean), but
"does this actually seed cleanly end-to-end" should be the very first thing
verified once this runs somewhere with a real Postgres connection, before
relying on it for a demo or a stakeholder walkthrough.

## What's still not tested at all

- Real database round-trips for any flow — registration actually creating a
  row, grading actually promoting a `LearnerSkill`, etc. This has been true
  since Stage B and remains true here; it is not something a testing stage
  alone can close without a working database connection.
- Real email delivery (Stage F2's standing limitation).
- Load/concurrency behavior (e.g. two learners completing the last criterion
  for a certificate at nearly the same moment — the collision-retry logic in
  `certificates.test.ts` covers the certificate-*number* collision case, but
  not a true concurrent-request race).
- Visual/accessibility regression testing beyond the manual audit in
  `SECURITY.md` (Stage F4) — no automated axe-core or Lighthouse CI wired up.
