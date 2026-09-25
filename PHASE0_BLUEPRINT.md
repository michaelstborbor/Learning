# EcoSkills Academy — Phase 0: Product & Technical Blueprint

**Status:** Draft for your review and approval
**Scope of this document:** Product Requirements Document (PRD), System Architecture, Database Entity Model, Technology Recommendation, MVP Definition, Development Roadmap, Risks, and Assumptions.
**Explicitly out of scope for this document:** Any code, any database migration, any UI. Per your brief's own rule, nothing gets built until you approve this.

---

## How to read this document

This is long because you asked for a genuinely complete Phase 0, covering everything your brief listed. You don't need to absorb it all in one sitting. The most important sections for your decision are:

- **Section 4 (MVP Scope)** — what we actually build first
- **Section 6 (Technology Recommendation)** — the stack decision
- **Section 9 (Roadmap)** — the order we build things in
- **Section 11 (Decisions Needed From You)** — the handful of things I genuinely cannot decide on your behalf

Everything else is the supporting detail for those decisions.

---

## 1. Product Requirements Document (PRD)

### 1.1 Product objective

EcoSkills Academy is a practical, competency-based digital skills and career development platform. The core loop is:

**Learn → Practice → Demonstrate → Certify → Connect**

It is explicitly *not* a video library. The distinguishing feature is that completing a video/module is treated as a separate, lesser event from **demonstrating competency** through a graded practical project. This distinction runs through the entire data model and UI, and it is the platform's main defensible difference from generic LMS products.

### 1.2 Target users (recap, with implications)

| User type | Implication for design |
|---|---|
| Learners (students, graduates, job seekers, professionals) | Mobile-first, low-bandwidth, price-sensitive, may have irregular connectivity |
| Course Instructors | Need a content authoring flow simple enough to use without developer help |
| Content Reviewers | Need a lightweight approval queue, not a full CMS |
| Organizations/Employers | Need cohort management and reporting, separate login context from individual learners |
| Mentors | Lightweight, mostly read + feedback access on assigned learners |
| Partner Training Centres | Attendance and hybrid session management |
| Platform/Super Admins | Full control, audit visibility, must never need to touch code for routine operations |

### 1.3 Representative user journeys

**Learner (B2C, free → paid path):**
Discover course on public catalogue → register → enrol in free intro course → complete modules → attempt quiz → submit practical assignment → get graded → (optionally) pay for a certificate-eligible course → complete final project → receive certificate → certificate appears on public verification page → learner adds it to Skills Passport → learner applies to an opportunity listing.

**Organization (B2B):**
Org admin registers organization profile → requests training or browses catalogue → purchases seats for a cohort → adds employees (bulk or individual) → monitors cohort dashboard (completion %, average score, certificates issued) → downloads a report for internal HR use.

**Instructor:**
Logs in → creates a course in Draft → builds modules/lessons/quizzes/assignments/project → submits for review → Content Reviewer approves or requests changes → course goes live → instructor grades submissions and views course analytics.

**Admin:**
Reviews new organization signups → manages user roles → reviews flagged content → issues/revokes certificates when required → reviews payment disputes → pulls platform-level analytics.

### 1.4 Functional requirements

Functional requirements map directly to Phases 3–19 of your original brief (public site, auth, learner dashboard, course management, learning experience, assessment engine, practical projects, skills passport, certification, payments, organization portal, cohorts, opportunities). I am not re-listing every bullet here since your original document already enumerates them precisely and completely — Phase 0's job is to organize them into a build order (Section 9) and confirm nothing is missing. I did not find gaps; your functional list is thorough.

One clarification worth stating explicitly: **"Assessment" and "Practical Project" are architecturally different objects**, not two names for the same thing. Assessments are typically auto-gradable (MCQ, true/false, etc.); Practical Projects are rubric-graded by a human (instructor/assessor). This distinction is what makes the Skills Passport credible later.

### 1.5 Non-functional requirements

| Category | Requirement |
|---|---|
| Performance | Usable on a low-end Android phone over 3G-equivalent speeds; initial page load target under ~3 seconds on a throttled connection |
| Availability | Managed hosting with automated backups; no requirement for multi-region failover at MVP stage — that would be overengineering for current scale |
| Security | Server-side authorization on every sensitive action; no client-side trust for payment or grading state |
| Accessibility | WCAG 2.2 AA as a target, not a hard certification requirement at MVP |
| Localization | English at launch; architecture must not hard-code language or country, but Krio/French UI translation is **not** built in MVP |
| Data protection | Designed to align with Sierra Leone's data protection framework as it exists today, and structured so stricter regional rules (e.g., if operating across ECOWAS states later) can be layered in without a rewrite |

**Important honesty note, consistent with your IDTS project:** Sierra Leone does not yet have a fully enacted, comprehensive data protection law in force (only a bill in progress, as of my last check). I will not claim "GDPR-equivalent compliance" or similar — I'll build strong generic privacy-by-design practices (minimization, role-based access, audit logs, consent capture, deletion workflow) rather than certifying compliance with a specific law that doesn't yet fully exist. This mirrors the caution I've been applying on IDTS.

### 1.6 MVP scope

See Section 4 — kept as its own section because it's the most consequential decision in this document.

### 1.7 Future scope (explicitly deferred)

AI tutor/recommendations, advanced recruitment/talent search, WhatsApp/SMS learning, offline-first sync, French localization, regional multi-country rollout, instructor marketplace, subscription bundles. These are named in your brief as "future" — I'm carrying that forward unchanged. Building them now would violate your own Rule 51 (do not overengineer).

### 1.8 Assumptions I'm making (flagged, not hidden)

- "EcoSkills Academy" is confirmed as the working name for this document; branding/logo work happens in Phase 2 (UI/UX system), not Phase 0.
- Initial currency for pricing display is the Sierra Leonean Leone (SLE, the redenominated Leone since 2022), formatted appropriately; actual payment provider integration is a decision item (Section 11).
- You are the Super Administrator at launch; no separate "platform owner" entity beyond you is assumed.
- Content (courses, quizzes) will initially be authored by you/your instructors — I am not assuming a large existing content library.

### 1.9 Constraints

- You have limited coding background — all admin operations must be doable through UI, no CLI/database access required for routine tasks (per your Section 45).
- Budget for infrastructure is not yet specified — the tech recommendation below is chosen partly to keep recurring hosting costs low and predictable (see Section 6.4).
- This is a solo-founder-supervised build — meaning documentation and "explain before you build" discipline (which you've asked for) matters more here than in a team setting, because you are the only human reviewer.

---

## 2. System Architecture

### 2.1 Overall shape: modular monolith

Per your Rule 51 and Section 8, I recommend a **modular monolith**, not microservices. Concretely: one Next.js application (frontend + API routes together) talking to one PostgreSQL database, with internal code organized into clear modules (`auth`, `courses`, `assessments`, `certificates`, `payments`, `organizations`, `notifications`, `analytics`). This gives you:

- One thing to deploy, one thing to monitor, one bill to pay
- Clear internal boundaries so modules *could* be split into services later if you ever reach a scale that needs it (unlikely for years)
- Dramatically lower operational complexity for a non-technical founder to reason about

### 2.2 Frontend architecture

- Next.js (React, TypeScript) using the App Router
- Server-side rendering for public pages (course catalogue, course detail, certificate verification) — this matters for low-bandwidth users and SEO (Phase 27 of your brief)
- Client-side interactivity only where needed (quiz-taking, video player, dashboards)
- Tailwind CSS for styling, with a small custom design-token layer so the brand doesn't look like generic Tailwind defaults

### 2.3 Backend architecture

- Backend logic lives inside the same Next.js project as typed API route handlers (or a thin Next.js + separate API layer if the project grows large enough to warrant it — a decision I'll revisit at Phase 1, not now)
- Prisma ORM against PostgreSQL for type-safe queries and migrations
- Business logic (e.g., "can this learner enrol," "is this certificate valid") lives in a service layer, not scattered across route handlers — this is what keeps Rule 7/8/9/10 (permission boundaries) enforceable and testable

### 2.4 Database architecture

Single PostgreSQL instance (managed, e.g., via the hosting provider's managed Postgres — same pattern as IDTS on Render, for consistency with what you already operate). Entity model in Section 3.

### 2.5 Authentication & authorization architecture

- Email/password with secure hashing (bcrypt/argon2) at MVP; social login deferred unless you tell me it's a priority
- Session via secure, httpOnly cookies (not raw JWT in localStorage — safer against XSS for a browser app)
- Role-Based Access Control (RBAC) enforced **server-side only** on every request — the frontend hiding a button is never treated as security
- Every role from your Section 4 gets an explicit permission set; "can this user see/do X" is checked in the service layer, never assumed from the UI state

### 2.6 File storage architecture

- Object storage (S3-compatible) for videos, PDFs, images, certificate assets — not stored in the database
- Uploaded files validated by type and size server-side; no executable file types accepted (per your Phase 20 security rule)
- Images compressed/resized on upload for low-bandwidth delivery

### 2.7 Payment architecture

- Abstracted "payment provider" interface — the core app never talks to a specific provider's API directly; it talks to an internal interface that a provider-specific adapter implements. This is what lets us add a second provider later without touching business logic.
- Payment status only changes via **server-verified provider callback/webhook**, never because the frontend says "payment succeeded" (per your Rule 4 — this is non-negotiable and I'll enforce it in code review at that phase)
- No raw card data stored, ever — provider-hosted checkout only

### 2.8 Notification architecture

- Internal notification service abstraction with pluggable channels (email first; SMS/WhatsApp are future, per your brief)
- Business logic triggers a notification *event*; the notification module decides how/where to deliver it — keeps things decoupled per your Phase 17 instruction

### 2.9 Certificate architecture

- Each certificate gets a unique, non-guessable verification ID
- Certificate record is immutable once issued; any correction creates a new audited record rather than editing history in place
- Public verification page looks up by ID/QR code only — no authentication required to verify, but no sensitive learner data exposed beyond what's needed to confirm authenticity (name, course, issue date, status)

### 2.10 Analytics architecture

- Analytics computed from the same operational database initially (no separate data warehouse at MVP scale — that would be overengineering)
- Role-scoped dashboards (platform-wide for admins, course-level for instructors, org-level for organizations, personal for learners) query the same underlying event/enrolment/assessment tables with different filters — one data model, multiple views

---

## 3. Database Entity Model (Phase 0 level — conceptual, not full schema)

This is the conceptual entity list with key relationships. Full column-level schema and actual Prisma migrations happen in Phase 1, once you approve this direction — writing exact field types now would be premature.

**Identity & access**
- `User` (base identity) → has one or more `Role` assignments → `Permission`s derived from role
- `LearnerProfile`, `InstructorProfile`, `MentorProfile`, `OrganizationProfile`, `PartnerCentreProfile` — each 1:1 with a `User`, holding role-specific fields

**Organizations**
- `Organization` → has many `OrganizationMember`s (linking `User`s to an org) and many `Cohort`s

**Courses**
- `Course` → belongs to `CourseCategory`, has a `CourseLevel`, belongs to an `Instructor`; has many `Module`s
- `Module` → has many `Lesson`s
- `Lesson` → has many `Resource`s
- `Course` → has one `Quiz` (or many, per module) → has many `Question`s → each has many `Answer` options
- `QuizAttempt` → belongs to `LearnerProfile` and `Quiz`, records score/pass-fail
- `Assignment` → belongs to `Course`/`Module`; has many `Submission`s from learners; each `Submission` has a `Grade`
- `Project` (practical project) → belongs to `Course`; has many `ProjectSubmission`s with rubric-based `Grade`s and an assessor reference

**Progress & enrolment**
- `Enrolment` → links `LearnerProfile` to `Course` (or `Cohort`), tracks status and progress %
- `LessonProgress` → per-learner, per-lesson completion tracking

**Skills & competency**
- `Skill` → master list, category-tagged
- `LearnerSkill` → links `LearnerProfile` to `Skill`, with proficiency level, evidence references (course/assessment/project), and verification status — this table *is* the Skills Passport

**Certification**
- `Certificate` → belongs to `LearnerProfile` and `Course`, unique verification ID, status (Active/Revoked/Expired), immutable once issued
- `CertificateAuditLog` → every status change recorded

**Commerce**
- `Order`, `Payment`, `Subscription`, `Coupon` → `Order` belongs to a `User` or `Organization`; `Payment` belongs to an `Order` and carries provider reference + verified status; state machine as specified in your Phase 12 (Pending/Successful/Failed/Cancelled/Refunded)

**Cohorts & hybrid learning**
- `Cohort` → belongs to `Course` and (optionally) `Organization`/`PartnerCentre`; has many `CohortMember`s and `AttendanceRecord`s

**Opportunities**
- `Opportunity` → created by `Organization`; has many `Application`s from `LearnerProfile`s, with status tracking

**Platform**
- `Notification`, `Review`, `AuditLog` — cross-cutting tables referenced by most modules above

This gives full coverage of the ~35 entities your brief listed, organized by relationship cluster rather than as a flat list, which will make the actual schema easier for you to review when we get there.

---

## 4. MVP Scope — what we build first, precisely

Rather than restating your Section 52 verbatim, here is the same scope organized by **build order priority**, because "MVP" still needs a first-thing-that-works:

**Tier 1 — must exist for the platform to function at all:**
Auth + RBAC, Course catalogue (public), Course detail, Course management (instructor), Enrolment, Lesson viewer + progress, Learner dashboard, Admin: user/course management.

**Tier 2 — makes it a real competency platform, not a video library:**
Quizzes (assessment engine), Assignments, Practical Projects + grading, Skills Passport, Content review workflow (Draft → Review → Publish).

**Tier 3 — makes it commercially usable:**
Payments (single provider first, abstracted for more), Certificates + public verification, Basic organization portal (profile, cohort, employee enrolment, progress dashboard).

**Tier 4 — completes the MVP as scoped in your brief:**
Opportunity listing (basic), Notifications (email only), Basic analytics dashboards per role, Audit logs, Certificate verification page, SEO basics for public pages.

Everything in your Section 42 ("Future Features — Do Not Implement") stays deferred. I'm not adding anything beyond what you scoped.

---

## 5. Internationalization note

Interface language: English only at MVP (per your Section 7). Database and content models will support multiple languages structurally (e.g., a `language` field on `Course`, locale-ready string handling) so Krio/French don't require a schema rewrite later — but no actual translated UI ships in MVP. This satisfies "don't hard-code" without building translation infrastructure prematurely.

---

## 6. Technology Recommendation

### 6.1 The default stack you proposed, evaluated

Your brief suggested Next.js/React, TypeScript, PostgreSQL, Prisma, Tailwind. I evaluated this against two realistic alternatives before confirming it:

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Next.js + TypeScript + PostgreSQL + Prisma + Tailwind** (your suggestion) | Huge ecosystem, one deployable unit, AI coding agents (including me) have the most training/documentation depth here, managed hosting is cheap and mature, SSR helps low-bandwidth SEO pages | TypeScript has a learning curve if you ever want to read code yourself | **Recommended** |
| Django (Python) + PostgreSQL | Very mature admin panel out of the box, good for a solo builder | Weaker fit for a highly interactive learner dashboard/video experience without extra frontend work; splits your stack into two languages | Not recommended — adds complexity without clear benefit here |
| Ruby on Rails + PostgreSQL | Fast to prototype, "convention over configuration" | Smaller current ecosystem/hiring pool in your context; less natural fit for a mobile-first SPA-like dashboard | Not recommended |

**Conclusion: your original instinct (Next.js/TS/Postgres/Prisma/Tailwind) is the right call**, and I'm not changing it. The main reason it wins for *you specifically*: it lets the entire application — frontend and backend — live in one project with one deployment pipeline, which is the lowest-operational-burden option for a non-technical founder, and it's the stack I (and most current AI coding tools) can maintain most reliably.

### 6.2 Hosting

Recommend a managed platform (e.g., Render or a comparable managed host) for consistency with your existing IDTS deployment experience — you already have a working mental model of "push code → managed DB → managed web service" from that project, which reduces your learning curve here.

### 6.3 Object storage

An S3-compatible object storage service (e.g., Cloudflare R2 or AWS S3) for files/videos — chosen for low cost and easy CDN pairing for low-bandwidth delivery.

### 6.4 Estimated recurring cost shape (rough, to be refined at deployment phase)

Not a firm quote — a directional estimate so there are no surprises: a managed Postgres instance + web service + object storage at small scale typically runs in the tens of US dollars per month range before any traffic-based scaling. I'll produce an exact estimate at the deployment phase (Phase 28 equivalent) once we know real usage patterns.

---

## 7. Development Roadmap (sequencing your Phases 1–30 into stages)

I'm grouping your 30 phases into 6 build stages so progress is easier to track — each stage ends with a working, testable increment, consistent with your "never claim complete without testing" rule.

| Stage | Your original phases covered | Outcome at end of stage |
|---|---|---|
| **A — Foundation** | 1 (project setup), 2 (design system) | Deployable empty shell with correct tooling, brand-consistent UI kit |
| **B — Identity & Public Site** | 3, 4 | Public marketing/catalogue pages live; registration/login working with RBAC |
| **C — Core Learning Loop** | 5, 6, 7, 8, 9, 10 | A learner can enrol, learn, quiz, submit a project, and see a Skills Passport entry |
| **D — Commerce & Credentials** | 11, 12 | Certificates issue and verify; payments gate paid content correctly and safely |
| **E — Organizations & Scale Features** | 13, 14, 15 | Org portal, cohorts, opportunity marketplace |
| **F — Platform Hardening** | 16–30 | Admin dashboard, notifications, analytics, search, security review, accessibility, performance, testing, seed data, content workflow, SEO, deployment, backups, final production audit |

Each stage will follow your Section 48 workflow exactly: inspect → explain → implement → lint → test → build → fix → security review → mobile review → docs → completion report — before I propose moving to the next stage.

---

## 8. Major Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| Scope creep across 30 phases | Easy to lose momentum on a project this large | Strict stage-by-stage delivery with your sign-off at each stage boundary, mirroring your IDTS milestone discipline |
| Payment provider availability/reliability in Sierra Leone | Directly affects whether B2C revenue actually works | Abstracted payment layer (Section 2.7) so we're never locked into one provider's uptime or coverage |
| Data protection ambiguity (no fully enacted national law yet) | Legal/reputational exposure if we overclaim compliance | Build strong generic privacy practices; never claim compliance with a law that isn't yet fully in force — same discipline applied on IDTS |
| Low-bandwidth user drop-off | Core target users are on constrained connections | Performance budgets enforced from Stage A onward, not retrofitted later |
| Certificate credibility/misrepresentation | Your brief explicitly warns against implying accreditation that doesn't exist | Certificates will state competency-based issuance only; no accreditation language unless you tell me a real accrediting body relationship exists |
| Solo non-technical founder as sole reviewer | Bugs or bad decisions could go unnoticed longer | Heavier reliance on automated tests + written completion reports at every stage, so review doesn't depend on you reading code |

---

## 9. Decisions Needed From You — RESOLVED (2026-09-14)

1. **Payment providers:** No payment integration at launch. The platform starts **free/open-access**, and is being built as an **open-source learning platform**. Payment provider abstraction (Section 2.7) is retained in the architecture so a provider can be plugged in later without a rewrite, but Stage D (Commerce & Credentials) is rescoped to **Credentials only** for now — certificates without a paywall. Payments move to a later stage, triggered when Michael decides to introduce them.
2. **Certificate issuing body:** "EcoSkills Academy" only, for now. The `Certificate` entity will include an optional `issuingPartner` reference field (nullable at launch) so a real partner institution can be added later without a schema migration.
3. **Relationship to IDTS:** Fully separate. No shared codebase, hosting account, branding, or database. Treated as two independent projects going forward.
4. **Hosting budget:** Not yet set. Priority is a working, well-tested system first; budget/hosting-tier conversation happens once the platform is functionally proven. Section 6.4 cost estimate remains directional only until then.

**License decision (flagged assumption, not asked because it's a low-risk reasonable default):** Since this is now explicitly open source, I'm defaulting to the **MIT License** — permissive, ubiquitous, allows commercial use later (important since you may reintroduce payments), and doesn't obligate you to open-source anything that builds on top of it. If you'd prefer something more restrictive (e.g., AGPL, which would require anyone hosting a modified version to also share their changes), tell me and I'll swap it — this is a one-file change at this stage.

**Status: Phase 0 approved. Proceeding to Phase 1.**

---

## 10. What happens next

Per your brief's explicit instruction, **I am stopping here.** I have not written any code, created any repository, or touched a database. If this blueprint looks right to you — in whole or with adjustments — tell me what to change, or approve it, and I'll begin **Stage A (Phase 1: Project Foundation)** next, following the same discipline you've seen on IDTS: explain, implement, test, verify, document, report.
