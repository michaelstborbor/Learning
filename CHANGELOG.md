# Changelog

Stage-by-stage record of what was built, per the phased development approach
in `PHASE0_BLUEPRINT.md`. Each stage's full detail lives in `ARCHITECTURE.md`;
this is a scannable summary.

## Stage F6 — SEO, Deployment, Backups & Production Readiness Audit
Sitemap and robots.txt (dynamic, reflecting real published content), page
metadata and Open Graph tags on every public page, JSON-LD structured data
on course pages, `DEPLOYMENT.md` (Render-based, with a backup/disaster-
recovery plan and cost estimate), `API.md`, `ADMIN_GUIDE.md`, `USER_GUIDE.md`,
and this changelog. Closes with `PRODUCTION_READINESS.md` — an honest final
audit against the brief's own Section 60 delivery table.

## Stage F5 — Testing & Seed Data
51 unit tests (Vitest), genuinely executed and passing — covering
certificate-issuance criteria, quiz grading, permission checks, the rate
limiter, tokens, and validation, against mocked dependencies where a real
database isn't available in this build environment. Playwright E2E specs
covering every flow the brief names explicitly (written, not executed — see
`TESTING.md`). `prisma/seed.ts` — realistic demo data: 8 sample courses
(matching the brief's own example list), every role, a cohort, an
opportunity, a completed certificate.

## Stage F4 — Security, Privacy, Accessibility & Performance Audit
A real audit, not a checklist. Found and fixed: a WCAG AA contrast failure
on every primary button (calculated, not eyeballed), a cohort attendance
endpoint that didn't verify learner IDs belonged to the cohort, and a
missing general-purpose admin audit trail. Added rate limiting on auth
endpoints, security response headers, and a skip-to-content link. Full
findings — including what was deliberately *not* fixed — in `SECURITY.md`.

## Stage F3 — Analytics, Search & Content Workflow
The real Draft → Under Review → Approved → Published → Archived course
workflow, with an active Content Reviewer role (replacing the simpler
Draft/Published-only flow from Stage C). Course-level analytics for
instructors, platform-wide analytics for admins, aggregate analytics for
organizations. Real search/filtering on courses and opportunities (plain
HTML forms, no client JS). Transparent, rule-based course recommendations —
no AI, per the brief's MVP guidance.

## Stage F2 — Notifications
A provider-abstracted email service (Resend), with every call site treating
email as best-effort — a failed or unconfigured send never blocks the
request it's part of. Email verification and password reset (both
previously blocked on this module). Real cohort email invites for employees
without an account — closing the honest gap named in Stage E.

## Stage F1 — Administration
An admin dashboard with live platform stats, user management (role changes,
account activation) — closing the "no UI to grant Instructor/Organization
roles" gap that existed since Stage C — and an organizations overview.

## Stage E — Organizations & Scale
Organization profiles, cohorts (a grouping/attendance layer built on top of
the normal course `Enrolment`, not a parallel system), an opportunity
marketplace (internships/jobs/apprenticeships/volunteer/project/mentorship),
and an application pipeline. Honest gap named: adding an employee without
an account had no invite mechanism yet (resolved in Stage F2).

## Stage D — Credentials (rescoped from "Commerce & Credentials")
Automatic certificate issuance (the concrete enforcement point for Rule
1/2 — a human grade, not lesson-watching, is what promotes a skill),
genuinely public certificate verification, and admin-only audited
revocation. Rescoped from the original "Commerce & Credentials" stage name
since payments are a deliberately deferred product decision.

## Stage C — Core Learning Loop
Courses, modules, lessons, enrolment and progress tracking, a knowledge
quiz engine (server-graded, answers never sent to the client unmarked), a
practical-project engine with instructor grading, and the Skills Passport.
Scope decisions made explicit: Assignment (as distinct from Project) and a
full Content Reviewer workflow were both deferred to later stages.

## Stage B — Identity & Public Site
Registration, login, logout, sessions (signed JWT, httpOnly cookies),
server-side RBAC. Public pages: home, courses (empty state — no Course
entity existed yet), about, contact, FAQs, terms, privacy, and a certificate
verification page shell (honestly labeled "not live yet" — no Certificate
entity existed yet).

## Phase 2 — Design System
Color/type tokens, a reusable component library, the
Learn→Practice→Demonstrate→Certify→Connect pipeline as an actual visual
device (not decoration — it's the platform's real structure). Self-hosted
headline font, system fonts for body text — no external font CDN.

## Phase 1 — Project Foundation
Next.js/TypeScript/Tailwind/Prisma scaffold, MIT license (this project is
open source), linting, environment variable template, CI workflow.

## Phase 0 — Product & Technical Blueprint
`PHASE0_BLUEPRINT.md` — the PRD, system architecture, conceptual database
model, technology evaluation, MVP scope, and development roadmap this entire
build followed.
